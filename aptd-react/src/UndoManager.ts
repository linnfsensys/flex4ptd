import TopStore, {DispatchType} from "./TopStore";
import cloneDeep from 'lodash/cloneDeep';
import {Action, ActionGroup, EnactType, ObjectType} from "./AptdClientTypes";
import {DoOrUndoType} from "./ValidationManager";
import HelpEngine, {Change, UndoableHelpGesture} from "./help/HelpEngine";
import WebSocketManager from "./WebSocketManager";


export default class UndoManager {
    /**
     * The doneStack is also thought of as "the undo stack".
     *  A stack (implemented as Array) of transaction groups (ActionGroups).
     *  A transaction group is a logically related set of changes to the persistent data store,
     *  i.e., an undoable action, a user gesture.
     *  Stack is populated by either a user gesture or by user hitting Redo button.
     *  Note that only user gestures are undoable--while Server msgs are not.
     *
     *  Note: doneStack is implemented as a javascript array, using push() and pop().
     *        However, to implement a simple way of tracking changes, when the array grows beyond
     *        the MAX_DONESTACK_SIZE, instead of unshifting the bottom element, it is simply deleted.
     *        This leaves the size of the array growing, but not holding on to references.
     *        That makes the length of the array a proxy for changes.
     *  @see UndoManager.undoStackChangedSinceLastSave()
     *  @see UndoManager.effectiveStackLength()
     */
    private doneStack: Array<ActionGroup>;
    /**
     * Stack of user gestures that have been undone by user (by pressing Undo button).
     */
    private undoneStack: Array<ActionGroup>;

    private doneStackLengthAtLastSuccessfulSave: number = 0;

    private doneHelpStack: Array<UndoableHelpGesture>;
    /** Q: is this needed? A: apparently not! */
    //private undoneHelpStack: Array<UndoableHelpGesture>;

    private topStore: TopStore;
    private webSocketManager: WebSocketManager | null;

    private helpEngine: HelpEngine|null = null;
    /**
     * an array of gesture ids, which are equivalent to ActionGroup.description,
     * awaited by HelpEngine
     */
    private gesturesToAwait: string[] = [];


    private static MAX_DONESTACK_SIZE: number = 50;
    /**
     * TODO: it is probably not needed to limit size of undoneStack,
     *       as that will happen automatically by limiting size of doneStack.
     */
    private static MAX_UNDONESTACK_SIZE: number = UndoManager.MAX_DONESTACK_SIZE;

    constructor(topStore: TopStore) {
        console.debug('UndoManager constructor start');
        this.doneStack = [];
        this.undoneStack = [];
        this.doneHelpStack = [];
        //this.undoneHelpStack = [];
        this.topStore = topStore;
        this.webSocketManager = null;
        this.enactActionsToStore = this.enactActionsToStore.bind(this);
        this.retractActionsInStore = this.retractActionsInStore.bind(this);
        this.onUndoClicked = this.onUndoClicked.bind(this);
        this.onRedoClicked = this.onRedoClicked.bind(this);
        this.setWebSocketManager = this.setWebSocketManager.bind(this);
        this.topStore.undoManager = this;
    }

    setDoneStackLengthAtLastSuccessfulSave(): void {
        this.doneStackLengthAtLastSuccessfulSave = this.doneStack.length;
    }

    /** do the Undo */
    public onUndoClicked(): void {
        // for simplicity, disallow undo if below last save level
        if (this.doneStack.length > this.doneStackLengthAtLastSuccessfulSave) {
            const topActionGroup = this.doneStack[this.doneStack.length-1];
            if (topActionGroup !== undefined) {
                const actionGroup: ActionGroup | undefined = this.doneStack.pop();
                if (actionGroup !== undefined) {
                    this.retractActionsInStore(actionGroup);
                    this.retractHelpStateIfMatches(actionGroup);
                } else {
                    console.error('UndoManager.onUndoClicked(): unexpected undefined actionGroup');
                }
            } else {
                console.error('UndoManager.onUndoClicked(): unexpected undefined topActionGroup');
            }
        } else {
            console.error('UndoManager.onUndoClicked(): unexpected undo below save level');
        }
    }

    /** do the Redo */
    public onRedoClicked(): void {
        const actionGroup: ActionGroup | undefined = this.undoneStack.pop();
        if (actionGroup !== undefined) {
            this.enactActionsToStore(actionGroup, EnactType.REDO);
        } else {
            console.error('UndoManager.onRedoClicked(): unexpected null actionGroup');
        }
    }

    public awaitGestures(gestureIds: string[]) {
        this.gesturesToAwait = gestureIds;
    }

    public isBelowSaveLevel(): boolean {
        return this.doneStack.length <= this.doneStackLengthAtLastSuccessfulSave;
    }

    public hasUndoableXacts(): boolean {
        return this.doneStack.length > 0 && this.effectiveStackLength(this.doneStack) > 0;
    }

    public hasRedoableXacts(): boolean {
        return this.undoneStack.length > 0;
    }

    public getUndoLabel(): string {
        return this.hasUndoableXacts() ? this.doneStack[this.doneStack.length-1].description : '';
    }
    public getRedoLabel(): string {
        return this.hasRedoableXacts() ? this.undoneStack[this.undoneStack.length-1].description : '';
    }

    public clearDoneStack(): void {
        this.doneStack = [];
    }
    public clearUndoneStack(): void {
        this.undoneStack = [];
    }


    /**
     * This method is called to enact a group of Actions (ActionGroup) that constitute a "gesture".
     * It is called either when user *does* a gesture, or upon Redo.
     * If this is done by a new user-initiated gesture, then first empty undoneStack.
     * TODO: consider also time-limiting the usefulness of undo, and maybe clearing the undo
     *       stack after a period of time.
     * @see retractActionsInStore()
     */
    public enactActionsToStore(actionGroup: ActionGroup, enactType: EnactType, callBack?: Function):void {
        console.trace('enactActionsToStore(): actionGroup=', actionGroup, 'enactType=', enactType);
        if (enactType === EnactType.USER_ACTION) {
            // clear the redo stack, as it becomes meaningless
            this.clearUndoneStack();
        }

        if (enactType !== EnactType.USER_ACTION_NOT_UNDOABLE &&
            enactType !== EnactType.SERVER_CONFIG_NOT_UNDOABLE) {

            // Want to add gesture to the doneStack.
            // First, check if doneStack is at max size
            if (this.effectiveStackLength(this.doneStack) >= UndoManager.MAX_DONESTACK_SIZE) {
                // remove the oldest gesture
                console.debug('enactActionsToStore(): doneStack is maxed, removing oldest gesture');
                this.removeBottomEntry(this.doneStack);
            }
            this.doneStack.push(actionGroup);

            // send GUIActive to server to keep the session alive
            if (this.webSocketManager !== null) {
                this.webSocketManager.sendGUIActiveMsg();
            }
        }

        // after the last action, do the validation, then the optional callBack
        const dispatchType = (enactType === EnactType.REDO ? DispatchType.REDO : DispatchType.ORIGINAL);
        for (let index = 0; index < actionGroup.actions.length; index++) {
            const action = actionGroup.actions[index];
            // for last action in actionGroup, also run validation
            if (index === actionGroup.actions.length - 1) {
                const validationCallBack:()=>void =
                    this.topStore.validationManager.makeValidationCallback(
                        actionGroup.actions, DoOrUndoType.ENACT, callBack);
                this.topStore.dispatch(action, dispatchType, validationCallBack);
            } else {
                this.topStore.dispatch(action, dispatchType);
            }
        }

        // This is not really after the actions run, but seems ok
        if (this.helpEngine !== null && this.helpEngine.isHelpEnabled()) {
            if (this.gesturesToAwait.includes(actionGroup.description)) {    
                this.gesturesToAwait = [];
                this.helpEngine.changeState(Change.GESTURE, actionGroup);
            }
        }
    }

    private removeBottomEntry(stack: ActionGroup[]) {
        for (let index = 0; index < stack.length; index++) {
            if (stack[index] === undefined) {
                continue;
            } else {
                console.debug('UndoManager.removeBottomEntry(): about to remove entry: ', stack[index].description);
                delete stack[index];
                return;
            }
        }
        // should not reach here
        console.error('UndoManager.removeBottomEntry(): unexpectedly found no valid entries');
    }

    private effectiveStackLength(stack: ActionGroup[]) {
        return stack.filter((ag:ActionGroup) => (ag !== undefined)).length;
    }


    /**
     * This method is called when user hits Undo button.
     * It will undo a single gesture (ActionGroup) and
     * push it onto the undoneStack.
     * @see enactActionsToStore()
     */
    public retractActionsInStore(actionGroup: ActionGroup):void {
        console.debug('retractActionsInStore(): (reverse xacts in store): actionGroup=', actionGroup);
        for (let i:number = actionGroup.actions.length-1; i >= 0; i--) {
            let action:Action = actionGroup.actions[i];
            // for last action in actionGroup, also run validation
            if (i === 0) {
                this.topStore.reverse(action, this.topStore.validationManager.makeValidationCallback(actionGroup.actions, DoOrUndoType.RETRACT));
            } else {
                this.topStore.reverse(action);
            }
        }

        // Want to add the actionGroup gesture to the undoneStack.
        // First, check if undoneStack is at max size.
        if (this.undoneStack.length === UndoManager.MAX_UNDONESTACK_SIZE) {
            // remove the oldest gesture
            console.debug('retractActionsInStore(): undoneStack is maxed, removing oldest gesture');
            this.undoneStack.shift();
        }
        this.undoneStack.push(actionGroup);
    }

    private retractHelpStateIfMatches(actionGroup: ActionGroup) {
        // if undo gesture matches top gesture in doneHelpStack
        let prevStateBeforeSkip = this.doneHelpStack.length - 1;
        while (prevStateBeforeSkip >= 0) {
            if (this.doneHelpStack[prevStateBeforeSkip].actionGroup.description === 'skip') {
                prevStateBeforeSkip = prevStateBeforeSkip -1;
            }
            else {
                break;
            }
        }
        if (this.doneHelpStack.length > 0 &&
            actionGroup.description === this.doneHelpStack[prevStateBeforeSkip].actionGroup.description) {

            while (this.doneHelpStack.length > prevStateBeforeSkip + 1) {
                this.doneHelpStack.pop();
            }
            const helpGesture: UndoableHelpGesture = this.doneHelpStack.pop()!;
            //this.undoneHelpStack.push(helpGesture);
            this.helpEngine!.setState(helpGesture.oldHelpStateId);
            // get the actionGroup that led to oldHelpStateId
            // Note: oldGestureLeadingToOldHelpState is not same as actionGroup param.
            //       It is 1 deeper in doneHelpStack.
            const oldGestureLeadingToOldHelpState: ActionGroup|null = this.doneHelpStack.length > 0 ?
                this.doneHelpStack[this.doneHelpStack.length - 1].actionGroup : null;
            this.helpEngine!.showStateAndAwaitNext(oldGestureLeadingToOldHelpState);
        }
    }

    /**
     * Currently not using in AptdApp.isSaveEnabled().
     * But it *is* used for color of save button and warning when leaving page.
     */
    public undoStackChangedSinceLastSave(): boolean {
        const changed: boolean = this.doneStack.length > this.doneStackLengthAtLastSuccessfulSave;
        return changed;
    }

    /**
     * TODO: not currently used
     * Q: why is this needed?
     * A: because when comparing stack size, selects are immaterial.
     *    E.g. if user did ONLY a bunch of selects, we should not enable the Green on Save.
     * @returns the size of parameter "stack", excluding those actions that are select actions
     */
    public getUsefulStackSize(stack: ActionGroup[]): number {
        return stack.filter(UndoManager.isNotASelectGesture).length;
    }

    private static isNotASelectGesture(actionGroup: ActionGroup): boolean {
        return ! actionGroup.description.includes('select');
    }

    public getUndoStack(): Array<ActionGroup> {
        return this.doneStack;
    }

    public getUndoStacksValidElements(): Array<ActionGroup> {
        return this.getUndoStack().filter(actionGroup => actionGroup !== null)
    }

    public getRedoStack(): Array<ActionGroup> {
        return this.undoneStack;
    }

    /**
     * purges doneStack of all gestures (ActionGroups) that contain mention of
     * a given id called objectIdToRemove.
     */
    public removeFromUndoStack(objectIdToRemove: string) {
        console.debug("UndoManager.removeFromUndoStack(): before purge: ", this.doneStack);
        const copyOfDoneStack:ActionGroup[] = this.purgeStack(objectIdToRemove, this.doneStack);
        this.doneStack = copyOfDoneStack;
        console.debug("UndoManager.removeFromUndoStack(): after purge: ", this.doneStack);
    }

    private purgeStack(objectIdToRemove: string, stack: ActionGroup[]) {
        // TODO: could just do a shallow copy
        //const copyOfStack: ActionGroup[] = cloneDeep(stack);
        const copyOfStack:ActionGroup[] = [...stack];
        for (let index = 0; index < copyOfStack.length; ++index) {
            let containsObjectId:boolean = false;
            for (let action of copyOfStack[index].actions) {
                // Leave 'selected' updates because that will be ignored by topstore
                if (action.objectType !== ObjectType.SELECTED &&
                    action.objectId === objectIdToRemove) {
                    containsObjectId = true;
                    break;
                }
            }
            if (containsObjectId) {
                copyOfStack.splice(index, 1);
                --index;
            }
        }
        return copyOfStack;
    }

    /** TODO: probably could be implemented with purgeStack() */
    public removeFromRedoStack(removeObjectId: string) {
        console.debug("removeFromRedoStack(): before purge: ", this.undoneStack);
        let copyOfUnDoneStack: ActionGroup[] = cloneDeep(this.undoneStack);
        for (let index = 0; index < copyOfUnDoneStack.length; ++index) {
            let containsObjectId = false;
            for (let action of copyOfUnDoneStack[index].actions) {
                if (action.objectType !== ObjectType.SELECTED &&
                    action.objectId === removeObjectId) {
                    containsObjectId = true;
                    break;
                }
            }
            if (containsObjectId) {
                copyOfUnDoneStack = copyOfUnDoneStack.splice(index, 1);
                --index;
            }
        }
        this.undoneStack = copyOfUnDoneStack;
        console.debug("removeFromRedoStack(): after purge: ", this.undoneStack);
    }

    public setHelpEngine(helpEngine: HelpEngine) {
        this.helpEngine = helpEngine;
    }

    public pushHelpGesture(undoableGesture: UndoableHelpGesture): void {
        this.doneHelpStack.push(undoableGesture);
    }

    public setWebSocketManager(webSocketManager: WebSocketManager) {
        this.webSocketManager = webSocketManager;
    }

    public getDoneStack(): ActionGroup[] {
        return this.doneStack;
    }
}
