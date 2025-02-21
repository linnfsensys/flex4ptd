import React, {Component, ReactNode} from 'react';
import {GUIAPConfigClient, ObjectType, UpdateType} from "./AptdClientTypes";
import SelectField, {Option} from "./fields/SelectField";
import RadioButtonGroupField from "./fields/RadioButtonGroupField";
import {UnitTypes} from "./AptdServerTypes";
import MapChooserField from "./fields/MapChooserField";
import TopStore from "./TopStore";
import UndoManager from "./UndoManager";
import HttpManager from "./HttpManager";
import MapImagesManager from "./MapImagesManager";


interface TimeZoneUnitsMapProps {
    mapVerbiage?: string,
    mapChooserRowSize: number,
    apModel: GUIAPConfigClient | null,
    initialization: boolean,
    topStore: TopStore,
    undoManager: UndoManager,
    httpManager: HttpManager,
    mapImagesManager: MapImagesManager,
}
interface TimeZoneUnitsMapState {
    apInitialized: boolean,
    forceScrollMapChooser: boolean,
    apInitialTimeZone: string,
}

export default class TimeZoneUnitsMapDisplay extends Component<TimeZoneUnitsMapProps, TimeZoneUnitsMapState> {

    private static UNITS_OPTIONS: Option[] = [
        {text: 'US', value: UnitTypes.IMPERIAL},
        {text: 'Metric', value: UnitTypes.METRIC}
    ];

    constructor(props: TimeZoneUnitsMapProps) {
        super(props);
        this.state = {
            apInitialized: false,
            forceScrollMapChooser: false,
            apInitialTimeZone: 'GMT',
        }
        this.onInitialTimeZoneChange = this.onInitialTimeZoneChange.bind(this);
    }


    render() {
        const html:ReactNode = (
            <div id="timezoneUnitsMaps">
                <table>
                    <tbody>
                    {this.props.initialization === true ?
                        <SelectField label="Gateway's Timezone"
                                     value={this.props.apModel === null ? '' : this.props.apModel.timeZone}
                                     key={'apTimeZone'}
                                     options={this.props.apModel === null ?
                                              [] : TimeZoneUnitsMapDisplay.optionize(this.props.apModel.allTimeZones)}
                                     idName={'apTimeZone'}
                                     className={'timeZone'}
                                     fieldName='timeZone'
                                     objectType={ObjectType.AP}
                                     objectId='AP'
                                     onValueChanged={this.onInitialTimeZoneChange}
                                     topStore={this.props.topStore}
                                     undoManager={this.props.undoManager}
                        />
                        :
                        null
                    }
                    <RadioButtonGroupField label='Units of Measurement abc'
                                           value={this.props.apModel === null ? UnitTypes.IMPERIAL : this.props.apModel.units}
                                           key={'apUnits'}
                                           options={TimeZoneUnitsMapDisplay.UNITS_OPTIONS}
                                           idName={'apUnits'}
                                           className={'apUnits'}
                                           fieldName='units'
                                           objectType={ObjectType.AP}
                                           objectId='AP'
                                           topStore={this.props.topStore}
                                           undoManager={this.props.undoManager}
                    />
                    <tr><td><br/></td><td></td></tr>
                    </tbody>
                </table>

                {this.props.mapVerbiage}
                <MapChooserField
                    rowSize={this.props.mapChooserRowSize}
                    forceScroll={this.state.forceScrollMapChooser}
                    undoManager={this.props.undoManager}
                    httpManager={this.props.httpManager}
                    topStore={this.props.topStore}
                    mapImagesManager={this.props.mapImagesManager}
                />
            </div>
        );
        return html;
    }

    static getDerivedStateFromProps(nextProps: Readonly<TimeZoneUnitsMapProps>,
                                    prevState: TimeZoneUnitsMapState):
                                    Partial<TimeZoneUnitsMapState> {
        if (! prevState.apInitialized &&
            nextProps.apModel !== null &&
            ! nextProps.apModel.initialized) {
            return {apInitialTimeZone: nextProps.apModel.timeZone,};
        } else if (! prevState.apInitialized &&
            nextProps.apModel !== null &&
            nextProps.apModel.initialized) {
            /**
             * This is intended to force the MapChooserField to scroll to the selection
             * only upon the transition from ap uninitialized to ap.initiaized in TopStore.
             * This should only happen on an APTD-virgin AP after user makes initial settings choices
             * and does a SaveInitConfig.  I.e., it should happen at most once.
             */
            return {apInitialized: true, forceScrollMapChooser: true,};
        } else {
            return {forceScrollMapChooser: false,};
        }
    }

    /**
     * converts hash from server from user-facing tz name -> official tz name
     * into an array of options.
     */
    public static optionize(timeZoneHash:{[p: string]: string}): Array<Option> {
        let options: Array<Option> = [];
        if (timeZoneHash !== null && timeZoneHash !== undefined) {
            options = Object.keys(timeZoneHash).map((userFacingTzName: string) => ({
                text: userFacingTzName,
                value: timeZoneHash[userFacingTzName]
            }));
        } else {
            console.error('unexpected null or undefined timeZoneHash');
        }
        return options;
    }

    private onInitialTimeZoneChange(tzValue: string): void {
        console.debug('onInitialTimeZoneChange(): tzValue=', tzValue, 'this.state.apInitialTimeZone=', this.state.apInitialTimeZone);
        if (tzValue !== this.state.apInitialTimeZone) {
            // User changed the time zone to a value different from what is stored on the AP.
            console.debug('onInitialTimeZoneChange(): reboot is required upon Save');
            this.props.topStore.enact({
                actions: [{
                    updateType: UpdateType.UPDATE,
                    objectId: '',
                    objectType: ObjectType.REBOOT_REQUIRED_ON_SAVE,
                    newData: true,
                }],
                description: 'set reboot required on save',
            });
        } else {
            // User changed the time zone to a value identical to what is stored on AP.
            console.debug('onInitialTimeZoneChange(): no reboot is required upon Save');
            this.props.topStore.enact({
                actions: [{
                    updateType: UpdateType.UPDATE,
                    objectId: '',
                    objectType: ObjectType.REBOOT_REQUIRED_ON_SAVE,
                    newData: false,
                }],
                description: 'clear reboot required on save',
            });
        }
    }

}
