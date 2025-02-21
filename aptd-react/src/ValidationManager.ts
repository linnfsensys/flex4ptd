import TopStore from "./TopStore";
import {
    Action,
    CharacterType,
    GUIAPConfigClient,
    GUICCSTSClient,
    GUIRadioClient,
    GUIRepeaterClient,
    GUISensorClient,
    GUISZClient,
    ObjectType,
    UpdateType
} from "./AptdClientTypes";
import {ColorCodeMode, IPMode, UnitTypes, VPNType} from "./AptdServerTypes";

interface ErrorInfo {
    fieldName: string,
    fieldIndex?: number,
    errorMsg: string,
}

export enum DoOrUndoType {
    ENACT = 'ENACT',
    RETRACT = 'RETRACT',
}

export interface ValidationAction {
    fieldId: string,
    objectType: ObjectType,
    errMsg: string,
    updateType: UpdateType,
    errorOnType?: ObjectType,
    errorOnId?: string,
}

/**
 * ValidationManager handles per-Mappable-object and per-Field validations,
 * and also handles global validations.
 * Each validation yields a key to the InfoPanel field where msgs will appear,
 * and an array of error msgs.
 * The validation errors and global validation errors are kept in TopStore,
 * but are manipulated by special purpose APIs of TopStore.
 */
export default class ValidationManager {
    private topStore: TopStore;

    public static goodRegexp:{[charType: string]: string} = {
        'INTEGER': '^-{0,1}\\d+$',
        'NONNEGATIVE_INTEGER': '^\\d+$',
        'FLOAT': '(^-{0,1}\\d*\\.{0,1}\\d*$)|(^-{0,1}.\\d+$)',
        'NONNEGATIVE_FLOAT': '(^\\d+\\.{0,1}\\d*$)|(^\\.\\d+$)',
        'DOTTED_QUAD': '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$',
        'DOTTED_QUAD_OR_HOSTNAME': '^([a-zA-Z0-9\\-]{1,63}\\.)+[a-zA-Z0-9\\-]+$|^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$',
        'NAME': '^[a-zA-Z0-9\\-\\_@#]+$',
        /** should match or be more severe than server regexp: Validators.VALID_SZ_NAME_REGEX */
        'NAME_WITH_BLANKS': '^[a-zA-Z0-9\\-\\_&@#/\\(\\)\\. ]+$',
        /** currently TEXT matches a-zA-Z0-9_!@#*+. */
        'TEXT': '^[\\w!@#$%\\*\\+\\.]+$'
    };
    private static readonly MAX_CC_EXTENSION: number = 15000;
    private static readonly MAX_CC_DELAY: number = 15000;
    private static readonly maxSensorsBehindLevel: number[] = [54, 20, 12, 4];


    constructor(topStore: TopStore) {
        this.topStore = topStore;
        this.makeValidationCallback = this.makeValidationCallback.bind(this);
    }

    public validateAP(apId: string):void {
        let actions: ValidationAction[] = [];

        // start by clearing any existing validation errors on the AP
        actions.push({
            errorOnId: 'AP',
            errorOnType: ObjectType.AP,
            objectType: ObjectType.VALIDATION_ERRORS,
            updateType: UpdateType.DELETE,
            errMsg: '',
            fieldId: '',
        });

        const ap:GUIAPConfigClient | null = this.topStore.getTopState().ap;
        if (ap === null) {
            return;
        }

        if (ap.ipAddrMode === IPMode.STATIC) {
            if (! ValidationManager.matchesRegexpForCharType(ap.ipAddr, CharacterType.DOTTED_QUAD_OR_HOSTNAME, true)) {
                let fieldKey: string = ValidationManager.makeErrorKey(ObjectType.AP, apId, 'ipAddr');
                actions.push({
                    objectType: ObjectType.VALIDATION_ERRORS,
                    updateType: UpdateType.ADD,
                    fieldId: fieldKey,
                    errMsg: 'Value must be a hostname (e.g., abc.com) or dotted quad format: (e.g., 999.999.999.999)',
                });
            }
            if (! ValidationManager.matchesRegexpForCharType(ap.netMask, CharacterType.DOTTED_QUAD, true)) {
                let fieldKey: string = ValidationManager.makeErrorKey(ObjectType.AP, apId, 'netMask');
                actions.push({
                    objectType: ObjectType.VALIDATION_ERRORS,
                    updateType: UpdateType.ADD,
                    fieldId: fieldKey,
                    errMsg: 'Value must be in dotted quad format: 999.999.999.999',
                });
            }
            if (! ValidationManager.matchesRegexpForCharType(ap.gateway, CharacterType.DOTTED_QUAD_OR_HOSTNAME, true)) {
                let fieldKey: string = ValidationManager.makeErrorKey(ObjectType.AP, apId, 'gateway');
                actions.push({
                    objectType: ObjectType.VALIDATION_ERRORS,
                    updateType: UpdateType.ADD,
                    fieldId: fieldKey,
                    errMsg: 'Value must be a hostname (e.g., abc.com) or dotted quad format: (e.g., 999.999.999.999)',
                });
            }
            if (! ValidationManager.matchesRegexpForCharType(ap.dns, CharacterType.DOTTED_QUAD, false)) {
                let fieldKey: string = ValidationManager.makeErrorKey(ObjectType.AP, apId, 'dns');
                actions.push({
                    objectType: ObjectType.VALIDATION_ERRORS,
                    updateType: UpdateType.ADD,
                    fieldId: fieldKey,
                    errMsg: 'Value must be in dotted quad format: 999.999.999.999 or empty',
                });
            }
        }

        if (ap.ipAddrMode === IPMode.DHCP) {
            if (! ValidationManager.matchesRegexpForCharType(ap.dhcpMonitorHost, CharacterType.DOTTED_QUAD_OR_HOSTNAME, false)) {
                let fieldKey: string = ValidationManager.makeErrorKey(ObjectType.AP, apId, 'dhcpMonitorHost');
                actions.push({
                    objectType: ObjectType.VALIDATION_ERRORS,
                    updateType: UpdateType.ADD,
                    fieldId: fieldKey,
                    errMsg: 'Value must be a hostname (e.g., abc.com) or dotted quad format: (e.g., 999.999.999.999)'
                });
            }
        }

        if (ap.vpnType !== VPNType.DISABLED) {
            if (! ValidationManager.matchesRegexpForCharType(ap.snapsServerHost, CharacterType.DOTTED_QUAD_OR_HOSTNAME, true)) {
                let fieldKey: string = ValidationManager.makeErrorKey(ObjectType.AP, apId, 'snapsServerHost');
                actions.push({
                    objectType: ObjectType.VALIDATION_ERRORS,
                    updateType: UpdateType.ADD,
                    fieldId: fieldKey,
                    errMsg: 'Value must be a hostname (e.g. abc.com) or dotted quad (e.g. 999.999.999.999)',
                });
            }
        }

        if (ap.vpnType !== VPNType.DISABLED && ! ValidationManager.matchesRegexpForCharType(ap.pppMonitorHost, CharacterType.DOTTED_QUAD_OR_HOSTNAME, false)) {
            let fieldKey: string = ValidationManager.makeErrorKey(ObjectType.AP, apId, 'pppMonitorHost');
            actions.push({
                objectType: ObjectType.VALIDATION_ERRORS,
                updateType: UpdateType.ADD,
                fieldId: fieldKey,
                errMsg: 'Value must be a hostname (e.g. abc.com) or dotted quad (e.g. 999.999.999.999)',
            });
        }

        // time config
        if (((ap.ipAddrMode === IPMode.STATIC && ap.ipAddr !== '') ||
             ap.ipAddrMode === IPMode.DHCP)) {
            for (let ntpHostIndex of [0, 1, 2]) {
                if (! ValidationManager.matchesRegexpForCharType(ap.ntpHosts[ntpHostIndex], CharacterType.DOTTED_QUAD_OR_HOSTNAME)) {
                    let fieldKey: string = ValidationManager.makeErrorKey(ObjectType.AP, apId, 'ntpHosts', ntpHostIndex);
                    actions.push({
                        objectType: ObjectType.VALIDATION_ERRORS,
                        updateType: UpdateType.ADD,
                        fieldId: fieldKey,
                        errMsg: 'Value must be a hostname (e.g. abc.com) or dotted quad (e.g. 999.999.999.999)',
                    });
                }
            }
        }

        if (ap.colorCodeMode === ColorCodeMode.MANUAL) {
            const colorCodeStr = ap.colorCodeHiNibbleManual + ap.colorCodeLoNibbleManual;
            const colorCode = parseInt(colorCodeStr, 16);
            if (colorCode < 0x01 || colorCode > 0x7C) {
                const fieldKey: string = ValidationManager.makeErrorKey(ObjectType.AP, apId, 'colorCodeLoNibbleManual');
                actions.push({
                    objectType: ObjectType.VALIDATION_ERRORS,
                    updateType: UpdateType.ADD,
                    fieldId: fieldKey,
                    errMsg: 'Value for Color Code must be between 01 and 7C',
                });
            }
        }

        // finally, post the errors to topLevel
        if (actions.length > 0) {
            this.topStore.dispatchValidationErrorsActions(actions);
        }
    }

    public validateMapSensor(dotid: string): void {
        // start by clearing any existing validation errors on this sensor
        const actions: ValidationAction[] = this.clearValidationErrorsForMapSensor(dotid);

        const sensor: GUISensorClient = this.topStore.getTopState().mapSensors[dotid];

        if (sensor === undefined) {
            // this could happen e.g. on an undo of drag from tray to map
            return;
        }

        const ccExtension: number = sensor.ccExtension;
        if (ccExtension < 0 || ccExtension > ValidationManager.MAX_CC_EXTENSION) {
            const fieldKey: string = ValidationManager.makeErrorKey(ObjectType.MAP_SENSOR, dotid, 'ccExtension');
            actions.push({
                objectType: ObjectType.VALIDATION_ERRORS,
                updateType: UpdateType.ADD,
                fieldId: fieldKey,
                errMsg: 'Extension Time must be between 0 and ' + ValidationManager.MAX_CC_EXTENSION + ' ms',
            });
        }

        const ccDelay: number = sensor.ccDelay;
        if (ccDelay < 0 || ccDelay > ValidationManager.MAX_CC_DELAY) {
            const fieldKey: string = ValidationManager.makeErrorKey(ObjectType.MAP_SENSOR, dotid, 'ccDelay');
            actions.push({
                objectType: ObjectType.VALIDATION_ERRORS,
                updateType: UpdateType.ADD,
                fieldId: fieldKey,
                errMsg: 'Delay Time must be between 0 and ' + ValidationManager.MAX_CC_DELAY + ' msec',
            });
        }

        if (actions.length > 0) {
            this.topStore.dispatchValidationErrorsActions(actions)
        }
    }

    private clearValidationErrorsForMapSensor(dotid: string): ValidationAction[] {
        const actions: ValidationAction[] = [{
            errorOnId: dotid,
            errorOnType: ObjectType.MAP_SENSOR,
            objectType: ObjectType.VALIDATION_ERRORS,
            updateType: UpdateType.DELETE,
            errMsg: "",
            fieldId: "",
        }];
        return actions;
    }

    public validateSensorZone(szId: string): void {
        // start by clearing ALL existing validation errors
        // on *this* sensorZone in topStore
        let actions: ValidationAction[] = this.clearValidationErrorsForSz(szId);

        const sz: GUISZClient = this.topStore.getTopState().sensorZones[szId];
        if (sz === undefined) {
            console.error('validateSensorZone(): sz is undefined for szId=', szId);
            return;
        }
        const userUnits: UnitTypes = this.topStore.getTopState().ap === null ? UnitTypes.IMPERIAL : this.topStore.getTopState().ap!.units as UnitTypes;

        // validate name
        if (! ValidationManager.matchesRegexpForCharType(sz.name.trim(), CharacterType.NAME_WITH_BLANKS, true)) {
            const errorFieldKey = ValidationManager.makeErrorKey(ObjectType.SENSOR_ZONE,
                szId, 'name');
            let action:ValidationAction = {
                objectType: ObjectType.VALIDATION_ERRORS,
                updateType: UpdateType.ADD,
                fieldId: errorFieldKey,
                errMsg: 'Name (required) may include letters, numbers, blanks, -_/&#@().',
            };
            actions.push(action);
        }

        // validate usage matches # sensors
        const errorInfo: ErrorInfo | null = ValidationManager.validateUsageMatchesNumSensors(sz);
        if (errorInfo !== null) {
            let fieldKey: string = ValidationManager.makeErrorKey(ObjectType.SENSOR_ZONE,
                                        szId, errorInfo.fieldName, errorInfo.fieldIndex);
            actions.push({
                objectType: ObjectType.VALIDATION_ERRORS,
                updateType: UpdateType.ADD,
                errMsg: errorInfo.errorMsg,
                fieldId: fieldKey,
            });
        }

        // spacings array must be filled in by user.  cannot be default '', or any nonpositive
        for (let sensorIndex = 0; sensorIndex < sz.sensorIds.length - 1; sensorIndex++) {
            const spacingMm = sz.spacingsMm[sensorIndex];
            const spacingCharType = userUnits === UnitTypes.IMPERIAL ? CharacterType.NONNEGATIVE_FLOAT : CharacterType.NONNEGATIVE_INTEGER;
            let spacingFieldKey: string =
                ValidationManager.makeErrorKey(ObjectType.SENSOR_ZONE,
                    szId,
                    'spacingsMm',
                    sensorIndex);

            if (spacingMm === '' ||
                ! ValidationManager.matchesRegexpForCharType(spacingMm, spacingCharType, true) ||
                +spacingMm < 100
            ) {
                let action:ValidationAction = {
                    objectType: ObjectType.SENSOR_ZONE,
                    updateType: UpdateType.ADD,
                    fieldId: spacingFieldKey,
                    errMsg: (userUnits === UnitTypes.IMPERIAL ?
                        'Spacing between Sensors must be at least 4in' :
                        'Spacing between Sensors must be at least 100mm'),
                };
                actions.push(action);
            }

            if (+spacingMm > 10000) {
                let action:ValidationAction = {
                    objectType: ObjectType.SENSOR_ZONE,
                    updateType: UpdateType.ADD,
                    fieldId: spacingFieldKey,
                    errMsg: (userUnits === UnitTypes.IMPERIAL ?
                        'Spacing between Sensors must be less than 394in' :
                        'Spacing between Sensors must be less than 10,000mm'),
                };
                actions.push(action);
            }

            const lengthCorrectionMm = sz.lengthCorrectionsMm[sensorIndex];
            const lcCharType = userUnits === UnitTypes.IMPERIAL ? CharacterType.FLOAT : CharacterType.INTEGER;
            let fieldKey: string =
                ValidationManager.makeErrorKey(ObjectType.SENSOR_ZONE,
                    szId,
                    'lengthCorrectionsMm',
                    sensorIndex);
            if (lengthCorrectionMm === '' ||
                ! ValidationManager.matchesRegexpForCharType(lengthCorrectionMm, lcCharType, false) ||
                +lengthCorrectionMm < 0
            ) {
                let action:ValidationAction = {
                    objectType: ObjectType.SENSOR_ZONE,
                    updateType: UpdateType.ADD,
                    fieldId: fieldKey,
                    errMsg: 'A non-negative numeric value is required for Length Correction between Sensors',
                };
                actions.push(action);
            }
            if (+lengthCorrectionMm > 10000) {
                let action:ValidationAction = {
                    objectType: ObjectType.SENSOR_ZONE,
                    updateType: UpdateType.ADD,
                    fieldId: fieldKey,
                    errMsg: (userUnits === UnitTypes.IMPERIAL ?
                        'Length Correction must be less than 394in' :
                        'Length Correction must be less than 10,000mm'),
                };
                actions.push(action);
            }
        }
        if (actions.length > 0) {
            this.topStore.dispatchValidationErrorsActions(actions);
        }
    }


    private clearValidationErrorsForSz(szId: string): ValidationAction[] {
        const actions: ValidationAction[] = [{
            errorOnId: szId,
            errorOnType: ObjectType.SENSOR_ZONE,
            objectType: ObjectType.VALIDATION_ERRORS,
            updateType: UpdateType.DELETE,
            errMsg: "",
            fieldId: "",
        }];
        return actions;
    }

    doGlobalValidations(): void {
        // Clear all global errmsgs
        let actions: ValidationAction[] = [];
        for (let fieldKey of Object.keys(this.topStore.getTopState().validationGlobalErrors)) {
            actions.push({
                updateType: UpdateType.DELETE,
                objectType: ObjectType.GLOBAL_VALIDATION_ERRORS,
                fieldId: fieldKey,
                errMsg: "",
            });
        }

        this.validateSzNameUniqueness(actions);
        this.validateSensorsHaveRfLink(actions);
        this.validateRepeatersHaveRfLink(actions);
        this.validateTimeslotSufficiencyOfRFConfig(actions);
        this.validateSensorsHaveValidCcLinks(actions);

        // TODO: are there more global validations to be done?...

        this.topStore.dispatchGlobalValidationErrorsActions(actions);
    }


    /** check every Sensor has an RF Link. */
    private validateSensorsHaveRfLink(actions: ValidationAction[]) {
        for (let sensor of Object.values(this.topStore.getTopState().mapSensors)) {
            if (sensor.info.rfLink === undefined ||
                sensor.info.rfLink.dstId === undefined ||
                sensor.info.rfLink.dstId === '' ||
                sensor.info.rfLink.lines.length === 0 ||
                (sensor.info.rfLink.lines[0].bPoint.x === 0 && sensor.info.rfLink.lines[0].bPoint.y === 0) ||
                (sensor.info.rfLink.lines[0].bPoint.x === 1 && sensor.info.rfLink.lines[0].bPoint.y === 1)) {
                // sensor lacks a proper rf link
                //const szId: string = this.topStore.getTopState().sensorDotidToSzId[sensor.id];
                const infoPanelKey: string = ValidationManager.makeInfoPanelKey(ObjectType.MAP_SENSOR, sensor.id);
                const errMsg = 'Sensor ' + sensor.id + ' needs RF link to Radio or Repeater';
                actions.push({
                    updateType: UpdateType.ADD,
                    objectType: ObjectType.GLOBAL_VALIDATION_ERRORS,
                    fieldId: infoPanelKey,
                    errMsg: errMsg,
                });
            }
        }
    }
    private validateRepeatersHaveRfLink(actions: ValidationAction[]) {
        for (let repeater of Object.values(this.topStore.getTopState().mapRepeaters)) {
            if (repeater.info.rfLink === undefined ||
                repeater.info.rfLink.dstId === undefined ||
                repeater.info.rfLink.dstId === '' ||
                repeater.info.rfLink.lines.length === 0 ||
                (repeater.info.rfLink.lines[0].bPoint.x === 0 && repeater.info.rfLink.lines[0].bPoint.y === 0) ||
                (repeater.info.rfLink.lines[0].bPoint.x === 1 && repeater.info.rfLink.lines[0].bPoint.y === 1)) {

                // repeater lacks a proper rf link
                const infoPanelKey: string = ValidationManager.makeInfoPanelKey(ObjectType.MAP_REPEATER, repeater.id);
                const errMsg = 'Repeater ' + repeater.id + ' needs RF link to Radio or Repeater';
                actions.push({
                    updateType: UpdateType.ADD,
                    objectType: ObjectType.GLOBAL_VALIDATION_ERRORS,
                    fieldId: infoPanelKey,
                    errMsg: errMsg,
                });
            }
        }
    }

    /**
     * Max # Sensors behind all repeaters/SPPs at a level depend on repeater's level from SPP
     * <pre>
     * Level 0 (SPP->Sensor)                 Max 54 Sensors
     * Level 1 (SPP->RP1->Sensor):           Max 20 Sensors
     * Level 2 (SPP->RP1->RP2->Sensor):      Max 12 Sensors
     * Level 3 (SPP->RP1->RP2->RP3->Sensor): Max  4 Sensors
     *
     * Pseudo-code of algorithm:
     * 1. first make sure there are no more than 3 Repeaters between any Sensor and an SPP
     * 2. Recursively descend the tree from each SPP as the root.
     *    At each RP/SPP node, sum the number of Sensors beneath it in the tree (at all levels).
     *    Call that count the nSensorsBehind for the RP/SPP.
     * 3. -
     * 4. Now look at each level.  (level 0 is SPP, level 1 is RP1s, level 2 is RP2s, level 3 is RP3s).
     *   Take sum(level) = ∑ (over all repeaters at that level) of nSensorsBehind(RP)
     *        (e.g. for level 1 we sum over all RP1 Repeaters).
     *   If sum(level) > max(level) then error.
     *   Where max(level) = [54, 20, 12, 4]
     * </pre>
     */
    private validateTimeslotSufficiencyOfRFConfig(actions: ValidationAction[]) {
        let repeaterIdsReachable: Array<string> = new Array<string>();
        for (let radio of Object.values(this.topStore.getTopState().radios)) {
            const sumByLevel: {[level: number]: number} = {};
            const devicesByLevel: {[level: number]: Array<string>} = {};
            const numSensorsBehindRadio: number = this.nSensorsBehind(radio, 0, actions, sumByLevel, devicesByLevel);
            console.debug('validateTimeslotSufficiencyOfRFConfig(): sumByLevel', sumByLevel, 'devicesByLevel=', devicesByLevel);

            for (let level in sumByLevel) {
                if (sumByLevel[level] > ValidationManager.maxSensorsBehindLevel[level]) {
                    console.debug('validateTimeslotSufficiencyOfRFConfig(): sumByLevel[' + level + '] exceeds max');
                    if (level === '0') {
                        console.debug('validateTimeslotSufficiencyOfRFConfig(): num sensors behind radio ' + radio.id + ' is ' + numSensorsBehindRadio);
                        actions.push({
                            updateType: UpdateType.ADD,
                            objectType: ObjectType.GLOBAL_VALIDATION_ERRORS,
                            fieldId: ValidationManager.makeInfoPanelKey(ObjectType.RADIO, radio.id),
                            errMsg: 'Radio ' + radio.id +
                                ' has too many Sensors directly connected to it (' +
                                numSensorsBehindRadio +
                                ').  Must not have more than ' +
                                ValidationManager.maxSensorsBehindLevel[0],
                        });
                    } else {
                        devicesByLevel[level].forEach((device) => {
                            actions.push({
                                updateType: UpdateType.ADD,
                                objectType: ObjectType.GLOBAL_VALIDATION_ERRORS,
                                fieldId: ValidationManager.makeInfoPanelKey(ObjectType.MAP_REPEATER, device),
                                errMsg: 'Repeaters with ' + (+level-1) +
                                    ' Repeaters between them and Radio (' +
                                    devicesByLevel[level].join(', ') +
                                    ') have too many Sensors behind them (' +
                                    sumByLevel[level] +
                                    ').  Must not have more than ' +
                                    ValidationManager.maxSensorsBehindLevel[level],
                            });
                        });
                    }
                }
            }

            // augment repeaterIdsReachable for this radio
            Object.keys(devicesByLevel)
                .filter((level:string) => (+level !== 0))  // level 0 is radio id
                .forEach((level:string) => {
                    repeaterIdsReachable = [...repeaterIdsReachable, ...devicesByLevel[+level]];
                });
        }

        // finally do cycle check.  Are there some repeaterIds that are not reachable?
        // If so, either user did not assign rf link, or there is a cycle of Repeaters.
        const repeaterIdsReachableSet:Set<string> = new Set<string>(repeaterIdsReachable);
        const allMapRepeaterIds:Set<string> = new Set<string>(Object.keys(this.topStore.getTopState().mapRepeaters));
        console.debug('validateTimeslotSufficiencyOfRFConfig(): repeaterIdsReachableSet=', repeaterIdsReachableSet, 'allMapRepeaterIds', allMapRepeaterIds);
        const unreachableRepeaterIds:Array<string> =
            Array.from(allMapRepeaterIds.values())
                .filter((id:string) => ! repeaterIdsReachableSet.has(id));
        if (unreachableRepeaterIds.length > 0) {
            console.warn('validateTimeslotSufficiencyOfRFConfig(): unreachableRepeaterIds not empty!: ', unreachableRepeaterIds);
            for (const repeaterId of unreachableRepeaterIds) {
                actions.push({
                    updateType: UpdateType.ADD,
                    objectType: ObjectType.GLOBAL_VALIDATION_ERRORS,
                    fieldId: ValidationManager.makeInfoPanelKey(ObjectType.MAP_REPEATER, repeaterId),
                    errMsg: 'Repeater(s) ' + unreachableRepeaterIds.join(', ') +
                        ' have no RF connection to a Radio, whether direct or indirect. ',
                });
            }
        } else {
            console.debug('validateTimeslotSufficiencyOfRFConfig(): unreachableRepeaterIds is empty. good!');
        }
    }

    /**
     * Recursive method.  For a given parentDevice, compute the total # of map sensors behind it,
     * regardless of how many levels of repeaters are in between.
     * Side effect: updates sumByLevel and devicesByLevel hashes.
     */
    private nSensorsBehind(parentDevice: GUIRadioClient | GUIRepeaterClient, level: number,
                           actions: ValidationAction[], sumByLevel: { [p: number]: number },
                           devicesByLevel: { [p: number]: Array<string> }): number {

        // count all mapSensors whose rfLink is directly to the parentDevice
        const nImmediateSensorsBehindParent: number =
            Object.values(this.topStore.getTopState().mapSensors)
            .filter((mapSensor: GUISensorClient) => (
                mapSensor.info.rfLink !== undefined && mapSensor.info.rfLink.dstId === parentDevice.id
            )).length;
        let nSensorsBehindParent: number = nImmediateSensorsBehindParent;

        // find all repeaters directly behind the parentDevice
        const repeatersBehindParent: GUIRepeaterClient[] =
            Object.values(this.topStore.getTopState().mapRepeaters)
            .filter((mapRepeater: GUIRepeaterClient) => (
                mapRepeater.info.rfLink !== undefined && mapRepeater.info.rfLink.dstId === parentDevice.id
            ));

        // test for depth too great
        if (repeatersBehindParent.length > 0 && level + 1 > 3) {
            const fieldId: string =
                ValidationManager.makeInfoPanelKey(ObjectType.MAP_REPEATER, repeatersBehindParent[0].id);
            const errMsg: string = 'Repeater ' + repeatersBehindParent[0].id +
                ' has too many Repeaters between it and the Radio.  ' +
                'A max of 3 Repeaters can be between a Sensor and a Radio.';
            actions.push({
                updateType: UpdateType.ADD,
                objectType: ObjectType.GLOBAL_VALIDATION_ERRORS,
                fieldId: fieldId,
                errMsg: errMsg,
            });
            // If we return 0 now, we get right return value, but wrong side effect values for
            // devicesByLevel, sumByLevel.  This is a problem because this is a "high priority"
            // error, so we'd like to bail out here, but if we do, we might miss cycle detection.
            // return 0;
        }

        let nSensorsBehindAllRepeatersForLevel: number = 0;  // for level: level+1
        for (const mapRepeater of repeatersBehindParent) {
            // following is recursive call:
            const nSensorsBehindRepeater = this.nSensorsBehind(mapRepeater, level + 1, actions, sumByLevel, devicesByLevel);
            nSensorsBehindAllRepeatersForLevel += nSensorsBehindRepeater;
            nSensorsBehindParent += nSensorsBehindRepeater;
        }

        // now, make conclusions:
        if (devicesByLevel[level] === undefined) {
            devicesByLevel[level] = [];
        }
        if (sumByLevel[level] === undefined) {
            sumByLevel[level] = 0;
        }
        devicesByLevel[level].push(parentDevice.id);
        sumByLevel[level] += nSensorsBehindParent;

        console.debug('validate nSensorsBehind parentDevice:', parentDevice.id, ' is ', nSensorsBehindParent);
        return nSensorsBehindParent;
    }


    /** check every Sensor has an RF Link. */
    private validateSensorsHaveValidCcLinks(actions: ValidationAction[]) {
        for (let sensor of Object.values(this.topStore.getTopState().mapSensors)) {
            if (sensor.info.ccLinks === undefined) {
                continue;
            }
            if (sensor.info.ccLinks.length >= 5) {
                // Too many cc links
                const infoPanelKey: string = ValidationManager.makeInfoPanelKey(ObjectType.MAP_SENSOR, sensor.id);
                const errMsg = '*Sensor ' + sensor.id + ' must not have more than 4 CC Links';
                actions.push({
                    updateType: UpdateType.ADD,
                    objectType: ObjectType.GLOBAL_VALIDATION_ERRORS,
                    fieldId: infoPanelKey,
                    errMsg: errMsg,
                });
            }
        }
    }

    /** Check all sz names are unique (case insensitive)
        If duplicate names are found, mark error in each duplicate-named sz */
    private validateSzNameUniqueness(actions: ValidationAction[]) {
        let szIdsBySzName: { [szName: string]: Array<string> } = {};
        let duplicateSZNamesExist: boolean = false;
        for (let sz of Object.values(this.topStore.getTopState().sensorZones)) {
            const szName: string = sz.name.toLocaleLowerCase();
            const szId: string = sz.id;
            if (szIdsBySzName[szName] === undefined) {
                szIdsBySzName[szName] = [szId];
            } else {
                szIdsBySzName[szName].push(szId);
                duplicateSZNamesExist = true;
            }
        }

        if (duplicateSZNamesExist) {
            // assign error msgs to each sz
            for (let szIds of Object.values(szIdsBySzName)) {
                if (szIds.length === 1) {
                    continue;  // no dup
                }
                for (let szId of szIds) {
                    const infoPanelKey: string = ValidationManager.makeInfoPanelKey(ObjectType.SENSOR_ZONE, szId);
                    const errMsg = 'Sensor Zone name must be unique';
                    actions.push({
                        updateType: UpdateType.ADD,
                        objectType: ObjectType.GLOBAL_VALIDATION_ERRORS,
                        fieldId: infoPanelKey,
                        errMsg: errMsg,
                    });
                }
            }
        }
    }

    private static validateUsageMatchesNumSensors(sz: GUISZClient): ErrorInfo | null {
        let result:ErrorInfo | null = null;
        switch (sz.otype) {
            case 'GUIStopbarSensorZone':
            case 'GUICountSensorZone':
                if (sz.sensorIds.length !== 1) {
                    result = {
                        fieldName: 'otype',
                        errorMsg: "Use must match the number of Sensors in Sensor Zone",
                    };
                }
                break;
            case 'GUISpeed2SensorZone':
                if (sz.sensorIds.length !== 2) {
                    result = {
                        fieldName: 'otype',
                        errorMsg: "Use must match the number of Sensors in Sensor Zone",
                    };
                }
                break;
            case 'GUISpeed3SensorZone':
                if (sz.sensorIds.length !== 3) {
                    result = {
                        fieldName: 'otype',
                        errorMsg: "Use must match the number of Sensors in Sensor Zone",
                    };
                }
                break;
            default:
                throw new Error('unexpected otype: ' + sz.otype);
        }
        return result;
    }

    /**
     * @return e.g. "sensor_zone-151-sensorZoneUse"
     */
    public static makeErrorKey(objectType: ObjectType, objectId: string, fieldName: string, fieldIndex?: number|string): string {
        let result:string = objectType +
            '-' + objectId +
            '-' + fieldName;
        if (fieldIndex === undefined) {
            return result;
        } else {
            return result + '-' + fieldIndex;
        }
    }

    /** @return e.g., "sensor_zone-151" */
    public static makeInfoPanelKey(objectType: ObjectType, szId: string) {
        return objectType + '-' + szId;
    }

    public makeValidationCallback(actions: Array<Action>, doOrUndoType: DoOrUndoType, callBack?: Function): ()=>void {
        return () => {
            if (doOrUndoType === DoOrUndoType.ENACT) {
                for (let action of actions) {
                    this.doValidation(action, doOrUndoType);
                }
            } else if (doOrUndoType === DoOrUndoType.RETRACT) {
                // do the validations in reverse, just as the actions are
                // executed in reverse, though unclear if that makes a difference
                for (let action of [...actions].reverse()) {
                    this.doValidation(action, doOrUndoType);
                }
            }
            this.doGlobalValidations();
            if (callBack !== undefined) {
                callBack();
            }
        }
    }


    private doValidation(action: Action, doOrUndoType: DoOrUndoType) {
        if ((doOrUndoType === DoOrUndoType.ENACT &&
            (action.updateType === UpdateType.ADD || action.updateType === UpdateType.UPDATE)) ||
            (doOrUndoType === DoOrUndoType.RETRACT &&
            (action.updateType === UpdateType.DELETE || action.updateType === UpdateType.UPDATE))) {

            switch (action.objectType) {
                case ObjectType.SENSOR_ZONE:
                    this.validateSensorZone(action.objectId);
                    break;
                case ObjectType.MAP_SENSOR:
                    this.validateMapSensor(action.objectId);
                    break;
                case ObjectType.AP:
                    this.validateAP(action.objectId);
                    break;
                case ObjectType.STS_ADDR_MAP:
                    this.validateStsAddrMap(action.objectId);
                    break;
                default:
                    // no validation needed
                    break;
            }
        } else if ((doOrUndoType === DoOrUndoType.ENACT && action.updateType === UpdateType.DELETE) ||
                   (doOrUndoType === DoOrUndoType.RETRACT && action.updateType === UpdateType.ADD)) {

            switch(action.objectType) {
                case ObjectType.SENSOR_ZONE:
                    this.clearSZValidationErrors(action.objectId);
                    break;
                case ObjectType.MAP_SENSOR:
                    this.clearMapSensorValidationErrors(action.objectId);
                    break;
                /*
                case ObjectType.STS_ADDR_MAP:
                    this.clearStsAddrMapValidationErrors(action.objectId);
                    break;
                */
                default:
                    // presumably no other deletes require clearing of validation
                    // do nothing!
                    console.debug('doValidation(): delete case. no clearing required for ', action.objectType);
                    break;
            }
        }
    }

    public static matchesRegexpForCharType(value: string, charType: CharacterType | undefined, required: boolean = false): boolean {
        if (charType === undefined) {
            if (required) {
                return value.trim() !== '';
            }
            return true;
        }
        let goodRegexpStr: string = ValidationManager.goodRegexp[charType as string];
        if (! required) {
            goodRegexpStr += '|^$';
        }
        const matches: boolean = (! required && value === undefined) || RegExp(goodRegexpStr).test(value);
        return matches;
    }


    private validateStsAddrMap(objectId: string):void {
        let actions: ValidationAction[] = [];

        // start by clearing any existing validation errors on the STS addr map (IPs)
        actions.push({
            errorOnId: 'STS',
            errorOnType: ObjectType.STS_ADDR_MAP,
            objectType: ObjectType.VALIDATION_ERRORS,
            updateType: UpdateType.DELETE,
            errMsg: '',
            fieldId: '',
        });

        const stsData: GUICCSTSClient = this.topStore.getTopState().ccCards['STS'] as GUICCSTSClient;
        const stsAddrMap: {[ip: string]: string} = stsData.addrMap;

        const IP_KEYS = ['IP1', 'IP2', 'IP3', 'IP4', 'IP5'];
        for (const ipKey of IP_KEYS) {
            if (! ValidationManager.matchesRegexpForCharType(stsAddrMap[ipKey], CharacterType.DOTTED_QUAD, false)) {
                actions.push({
                    objectType: ObjectType.VALIDATION_ERRORS,
                    updateType: UpdateType.ADD,
                    fieldId: ValidationManager.makeErrorKey(ObjectType.STS_ADDR_MAP, 'STS', 'addrMap', ipKey),
                    errMsg: 'Value must be dotted quad format: (e.g., 999.999.999.999)',
                });
            }
        }

        // finally, post the errors to topLevel
        if (actions.length > 0) {
            this.topStore.dispatchValidationErrorsActions(actions);
        }
    }

    private clearSZValidationErrors(objectId: string) {
        const actions: ValidationAction[] = this.clearValidationErrorsForSz(objectId);
        this.topStore.dispatchValidationErrorsActions(actions);
    }
    private clearMapSensorValidationErrors(objectId: string) {
        const actions: ValidationAction[] = this.clearValidationErrorsForMapSensor(objectId);
        this.topStore.dispatchValidationErrorsActions(actions);
    }
}