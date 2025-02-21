import {ActionGroup, GUISZClient, ObjectType, UpdateType, TransformType} from "../AptdClientTypes";
import UndoManager from "../UndoManager";
import TopStore from "../TopStore";
import cloneDeep from 'lodash/cloneDeep';
import HelpDefaultPathProvider from "./HelpDefaultPath";


export enum HelpLocType {
    MAP_OBJECT = 'MAP_OBJECT',
    TRAY_OBJECT = 'TRAY_OBJECT',
    TRAY = 'TRAY',
    CC_OBJECT = 'CC_OBJECT',
    INFO_PANEL_FIELD = 'INFO_PANEL_FIELD',
    MAP_UPPER_LEFT_QUADRANT = 'MAP_UPPER_LEFT_QUADRANT',
    MAP_UPPER_RIGHT_QUADRANT = 'MAP_UPPER_RIGHT_QUADRANT',
    MAP_LOWER_LEFT_QUADRANT = 'MAP_LOWER_LEFT_QUADRANT',
    MAP_LOWER_RIGHT_QUADRANT = 'MAP_LOWER_RIGHT_QUADRANT',
    BUTTON_TOP_BAR = 'BUTTON_TOP_BAR',
}

export interface HelpLoc {
    helpLocType: HelpLocType,
    locObjectId?: string,
    locObjectType?: ObjectType,
    infoPanelFieldId?: string,
}

export interface HelpWidget {
    location: HelpLoc,
}

export interface Balloon extends HelpWidget {
    /** text can have multiple lines, separated by <br> tags */
    text: string,
    skipButtonPresent: boolean,
}

export interface Hilight extends HelpWidget {
    transformType?: TransformType,
}

export interface Arrow extends HelpWidget {
    to: HelpLoc,
}

export interface State {
    name: string,
    balloons: Balloon[],
    hilights: Hilight[],
    arrows: Arrow[],
    final?: boolean,
}

export enum GestureType {
    UNDOABLE_GESTURE = "UNDOABLE_GESTURE",
    BUTTON_PRESS = "BUTTON_PRESS",
    SELECT_GESTURE = "SELECT_GESTURE",
}

export enum Change {
    GESTURE = 'GESTURE',
    BUTTON_PRESS = 'BUTTON_PRESS',
    NEXT = 'NEXT',
    // CLOSE is equivalent to Hide Help button
    CLOSE = 'CLOSE',
}
export interface Gesture {
    type: GestureType,
    /** for UndoableGesture, id is the description of the ActionGroup.
     *  for ButtonPressGesture, id is the id of the button in dom */
    id: string,
}

export interface UndoableHelpGesture {
    oldHelpStateId: string,
    /** the actionGroup description that caused the old help state, or null if oldHelpStateId is 'start' */
    //oldHelpStateGestureId: string | null,
    /** the gesture that provoked new state */
    actionGroup: ActionGroup,
}

export interface HelpDataProvider {
    getStateMachine: ()=>StateMachine,
}

/**
 * The HelpEngine StateMachine for a given "path" consists of 3 JSON
 * structures:
 *     stateByName is a mapping from stateName to State content.
 *     gestureByName is a mapping from gestureName to Gesture type.
 *                      gestureName is typically either a Gesture description
 *                      or a button dom id.
 *     stateNameByPrevStateAndGesture  is a mapping from state to
 *                     possible next gestures and for each next gesture,
 *                     the resulting next state
 *
 * The initial state of a "path" is always called "start".
 * There can be multiple final states.  final is an attribute of State.
 */
export interface StateMachine {
    stateByName: {[stateName: string]: State},
    gestureByName: {[gestureName: string]: Gesture},
    stateNameByPrevStateAndGesture: {[stateName: string]: {[gestureId: string]: string}},
}

/**
 * TODO: we are relying on description strings used in ActionGroups.
 *       To make the code more robust (and eventually internationalizable)
 *       it would be better to make all those strings into constants (or enums)
 *       both here and in the code that creates the ActionGroups.
 */
export default class HelpEngine {
    private readonly stateMachine: StateMachine|null = null;
    private currentState: State;
    private undoManager: UndoManager;
    private helpEnabled: boolean;
    private initHelpEngine: boolean;
    private awaitedButtonIds: string[];
    private topStore: TopStore;

    constructor(undoManager: UndoManager, topStore: TopStore) {
        const helpDataProvider: HelpDataProvider = new HelpDefaultPathProvider();
        this.stateMachine = helpDataProvider.getStateMachine();
        // regardless of 'path', always start with state 'start'.
        this.currentState = this.stateMachine.stateByName['start'];
        this.undoManager = undoManager;
        undoManager.setHelpEngine(this);
        this.helpEnabled = false;
        this.initHelpEngine = true;
        this.awaitedButtonIds = [];
        this.topStore = topStore;
        this.getASensorInSZ = this.getASensorInSZ.bind(this);
        this.massage = this.massage.bind(this);
    }

    public showStateAndAwaitNext(actionGroup: ActionGroup|null, buttonId?: string) {
        if (this.stateMachine === null) {
            throw new Error('unexpected null stateMachine');
        }
        if (this.helpEnabled || this.initHelpEngine) {
            this.initHelpEngine = false;
            this.showStateContents(actionGroup, buttonId);

            if (this.currentState.final === undefined ||
                ! this.currentState.final) {

                const gestureToState: { [gestureid: string]: string } = this.stateMachine.stateNameByPrevStateAndGesture[this.currentState.name];
                const gestureIds: string[] = Object.keys(gestureToState).filter((gestureId: string) => this.stateMachine!.gestureByName[gestureId].type === GestureType.UNDOABLE_GESTURE);

                this.awaitedButtonIds = Object.keys(gestureToState).filter((gestureId: string) => this.stateMachine!.gestureByName[gestureId].type === GestureType.BUTTON_PRESS);

                this.undoManager.awaitGestures(gestureIds);

            } else {
                this.undoManager.awaitGestures([]);
                // currentState is a final state.
                // nothing to await any more.  all done with Help.
                // TODO: do we need to set a state?
                //       would like to disable help, but don't want to
                //       lose the final balloon.
                //       The final balloon should have a clear OK or
                //       DONE button to dismiss it.
            }
        } else {
            console.error('asking to show state but help not enabled');
            this.removeStateContents();
        }
    }

    /**
     * We show the help widgets associated with this.currentState.
     * However, we need the provoking gesture (either ActionGroup or buttonId),
     * in order to fill in some parameterized info in the widgets.
     */
    private showStateContents(actionGroup: ActionGroup|null, buttonId?: string): void {
        if (actionGroup !== null && buttonId !== undefined) {
            // one param or the other should be valid, but not both.
            throw new Error('HelpEngine.showStateContents(): unallowed state');
        }
        if (actionGroup !== null || buttonId !== undefined) {
            // go on
        } else {
            console.info('HelpEngine.showStateContents(): assuming start state');
            if (this.currentState.name !== 'start') {
                throw new Error('HelpEngine.unexpected state: ' + this.currentState.name);
            }
            // go on
        }

        const massagedBalloons: HelpWidget[] = this.massage(this.currentState.balloons, actionGroup, buttonId);
        const massagedHilights: HelpWidget[] = this.massage(this.currentState.hilights, actionGroup, buttonId);
        const massagedArrows: HelpWidget[] = this.massage(this.currentState.arrows, actionGroup, buttonId);

        this.topStore.dispatchAll([{
            objectType: ObjectType.HELP_BALLOONS,
            objectId: '',
            updateType: UpdateType.ADD,
            newData: massagedBalloons,
            origData: null,
        }, {
            objectType: ObjectType.HELP_HILIGHTS,
            objectId: '',
            updateType: UpdateType.ADD,
            newData: massagedHilights,
            origData: null,
        }, {
            objectType: ObjectType.HELP_ARROWS,
            objectId: '',
            updateType: UpdateType.ADD,
            newData: massagedArrows,
            origData: null,
        }]);
    }

    private removeStateContents() {
        this.topStore.dispatchAll([{
            objectType: ObjectType.HELP_BALLOONS,
            objectId: '',
            updateType: UpdateType.ADD,
            newData: [],
            origData: null,
        }, {
            objectType: ObjectType.HELP_HILIGHTS,
            objectId: '',
            updateType: UpdateType.ADD,
            newData: [],
            origData: null,
        }, {
            objectType: ObjectType.HELP_ARROWS,
            objectId: '',
            updateType: UpdateType.ADD,
            newData: [],
            origData: null,
        }]);
    }

    /**
     * We expect that either actionGroup is null or buttonId is undefined.
     * Only one of these params is used to change the state.
     * We also assume that this method is only called if a passed parameter
     * is already being awaited by the currentState of the HelpEngine.
     */
    public changeState(changeType: Change, actionGroup: ActionGroup|null, buttonId?: string) {
        const gestureToState: { [gestureid: string]: string } = this.stateMachine!.stateNameByPrevStateAndGesture[this.currentState.name];
        const oldHelpStateId: string = this.currentState.name;
        let nextStateId: string|undefined = undefined;

        if (gestureToState === undefined || gestureToState === null) {
            console.error('unexpectedly lacking gestureToState');
        } else {
            switch (changeType) {
                case Change.GESTURE:
                    if (actionGroup !== null) {
                        nextStateId = gestureToState[actionGroup.description];
                    } else {
                        throw new Error('unexpected state');
                    }
                    break;
                case Change.BUTTON_PRESS:
                    if (buttonId !== undefined) {
                        nextStateId = gestureToState[buttonId];
                    } else {
                        throw new Error('unexpected state');
                    }
                    break;
                case Change.NEXT:
                    nextStateId = gestureToState['skip'];
                    break;
                default:
                    throw new Error('unexpected state');
            }
        }

        if (nextStateId === undefined) {
            console.debug('HelpEngine.changeState(): no nextState for: ', actionGroup, buttonId);
        } else {
            this.currentState = this.stateMachine!.stateByName[nextStateId];
            console.debug('HelpEngine.changeState(): new state=', this.currentState.name, 'upon gesture: ', actionGroup, 'and buttonId: ', buttonId);
            this.removeStateContents();
            setTimeout(()=> {
                this.showStateAndAwaitNext(actionGroup, buttonId);
            }, 100);

            if (actionGroup !== null) {
                // it was a state change due to user gesture.
                this.undoManager.pushHelpGesture({
                    oldHelpStateId: oldHelpStateId,
                    actionGroup: actionGroup,
                })
            }
        }
    }

    public setState(helpStateName: string) {
        this.currentState = this.stateMachine!.stateByName[helpStateName];
    }

    public setHelpEnabled(enabled: boolean) {
        if (!enabled) {
            if (this.currentState.final && this.stateMachine !== null) {
                this.setState('start');
                this.showStateAndAwaitNext(null);
            }
        }
        this.helpEnabled = enabled;
    }
    public isHelpEnabled(): boolean {
        return this.helpEnabled;
    }

    /**
     * Do a deep copy of helpWidgets, substituting action objectId that
     * matches the desired objectType for '$objectId'
     * We assume either actionGroup is null or buttonId is undefined.
     */
    private massage(helpWidgets: HelpWidget[], actionGroup: ActionGroup | null, buttonId?: string): HelpWidget[] {
        let massagedWidgets: HelpWidget[] = cloneDeep(helpWidgets);
        if (actionGroup !== null) {
            for (let widget of massagedWidgets) {
                if (widget.location.locObjectId === '$objectId') {
                    let widgetMassageSuccess: boolean = false;
                    // need to fill in widget's locObjectId from an action
                    // that matches widget's locObjectType
                    // first check object type is as expected
                    for (const action of actionGroup.actions) {
                        if (widget.location.locObjectType === action.objectType) {
                            widget.location.locObjectId = action.objectId;
                            let ballonWidget = widget as Balloon;
                            if (ballonWidget !== null && ballonWidget !== undefined &&
                                ballonWidget.text !== null && ballonWidget.text !== undefined) {
                                ballonWidget.text = ballonWidget.text.replace('$objectId', action.objectId);
                            }
                            widgetMassageSuccess = true;
                            break;
                        }
                    }
                    if (! widgetMassageSuccess) {
                        console.warn('HelpEngine.massage(): Could not match an action to get objectId on 1st try');
                        // 2nd try.  If looking for a MAP_SENSOR, and action has a SENSOR_ZONE, pick a Sensor from the SZ
                        if (widget.location.locObjectType === ObjectType.MAP_SENSOR) {
                            let widgetMassageSuccess: boolean = false;
                            // need to fill in widget's locObjectId from an action
                            // that matches widget's locObjectType
                            // first check object type is as expected
                            for (const action of actionGroup.actions) {
                                if (ObjectType.SENSOR_ZONE === action.objectType) {
                                    widget.location.locObjectId = this.getASensorInSZ(action.objectId);
                                    let ballonWidget = widget as Balloon;
                                    if (ballonWidget !== null && ballonWidget !== undefined &&
                                        ballonWidget.text !== null && ballonWidget.text !== undefined) {
                                        ballonWidget.text = ballonWidget.text.replace('$objectId', widget.location.locObjectId);
                                    }
                                    widgetMassageSuccess = true;
                                    break;
                                }
                            }
                            if (!widgetMassageSuccess) {
                                console.warn('HelpEngine.massage(): Could not match an action to get objectId on 1st try');
                                // 2nd try.  If looking for a MAP_SENSOR, and action has a SENSOR_ZONE, pick a Sensor from the SZ
                            }
                        } else {
                            console.error('HelpEngine.massage(): could not match an action to get objectId on 2nd try');
                        }
                    }
                }
            }
        } else if (buttonId !== undefined) {
            // I don't think we need to massage any widgets based on button press
            /*
            for (let widget of massagedWidgets) {
                if (widget.location.locObjectId === '$objectId') {
                    // need to fill in widget's locObjectId
                    if (widget.location.locObjectType === ObjectType.BUTTON_TOP_BAR) {
                        widget.location.locObjectId = buttonId;
                        break;
                    } else {
                        console.error('massage(): unexpected state for buttonId', buttonId);
                    }
                }
            }
            */
        } else {
            // could happen at start time
            console.debug('HelpEngine.massage(): assuming start state: no massaging');
        }
        return massagedWidgets;
    }

    public setAwaitedButtonIds(buttonIds: string[]):void {
        this.awaitedButtonIds = buttonIds;
    }
    public getAwaitedButtonIds(): string[] {
        return this.awaitedButtonIds;
    }

    /**
     * @returns dotid of a map Sensor that is in the SZ
     */
    private getASensorInSZ(szId: string):string {
        const sz: GUISZClient = this.topStore.getTopState().sensorZones[szId];
        const sensorDotId: string = sz.sensorIds[0];
        return sensorDotId;
    }

    public getCurrentState(): State {
        return this.currentState;
    }

}
