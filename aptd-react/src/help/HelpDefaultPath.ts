/**
 * HelpDefaultPath holds the JSON data for the default HelpEngine "path".
 * This is the help guide shown to user when first starting APTD.
 * It starts with dragging a Sensor from Tray to Map and ends with Save.
 *
 * Note that Gesture names must exactly match the description field
 * of an ActionGroup used in MapAndTray.
 */
import {GestureType, HelpDataProvider, HelpLocType, StateMachine} from "./HelpEngine";
import {ObjectType, TransformType} from "../AptdClientTypes";

export default class HelpDefaultPath implements HelpDataProvider {
    private readonly stateMachine:StateMachine = {
        stateNameByPrevStateAndGesture: {
            'start': {
                'startScan': 'requestDragToMap',
                'skip': 'requestDragToMap'
            },
            'requestDragToMap': {
                'move Sensor to Map': 'afterDraggedSensorToMap',
            },
            'afterDraggedSensorToMap': {
                'move Sensor Zone': 'afterMoveSensorZone',
                //'remove Sensor from Map': 'start',
                'skip': 'afterMoveSensorZone',
            },
            'afterMoveSensorZone': {
                'rotate Sensor Zone': 'afterRotateSensorZone',
                //'remove Sensor from Map': 'start',
                'skip': 'afterRotateSensorZone',
            },
            'afterRotateSensorZone': {
                "create RF Link to Radio or Repeater": 'afterCreatedRfLink',
                'skip': 'afterCreatedRfLink',
                //'remove Sensor from Map': 'start',
            },
            'afterCreatedRfLink': {
                'move rf link': 'afterChangedRfLink',
                'skip': 'afterChangedRfLink',
                //'remove Sensor from Map': 'start'
            },
            'afterChangedRfLink': {
                'save': 'afterSaveClicked',
                'skip': 'anotherFinalState',
                //'remove Sensor from Map': 'start'
            }
        },
        stateByName: {
            start: {
                name: 'start',
                balloons: [{
                    text:
                        'Check if the Tray contains the Sensors and Repeaters you need to configure.\n' +
                        'If it does, skip this step.\n' +
                        'If it does not, wait while the "Receiving Device Configuration" scan runs.\n' +
                        '(You will see the scan at the top of the page).\n' +
                        'If you still don\'t see the Sensors and Repeaters you need to configure,\n' +
                        'start by clicking the "Find Devices" button.\n' +
                        'This will populate the Tray with nearby Sensors and Repeaters\n' +
                        'that you can configure for this Gateway.\n\n' +
                        'Note: Clicking the "Find Devices" button may put the detection system\n' +
                        'into constant call (if the Gateway is associated with a traffic signal)\n' +
                        'while the system searches for nearby devices.\n' +
                        'This typically takes 2 minutes.',
                    skipButtonPresent: true,
                    location: {
                        helpLocType: HelpLocType.BUTTON_TOP_BAR,
                        locObjectId: 'save',
                        locObjectType: ObjectType.BUTTON_TOP_BAR,
                    },
                }, {
                    text: 'Tray',
                    skipButtonPresent: false,
                    location: {
                        helpLocType: HelpLocType.TRAY,
                    }
                }],
                hilights: [{
                    location: {
                        helpLocType: HelpLocType.BUTTON_TOP_BAR,
                        locObjectId: 'startScan',
                        locObjectType: ObjectType.BUTTON_TOP_BAR,
                    }
                }],
                arrows: [],
            },

            requestDragToMap: {
                name: 'requestDragToMap',
                balloons: [{
                    text: 'Drag any Sensor\nfrom Tray to Map\nto configure it.',
                    skipButtonPresent: false,
                    location: {
                        helpLocType: HelpLocType.MAP_LOWER_RIGHT_QUADRANT
                    }
                }, {
                    text: 'Tray',
                    skipButtonPresent: false,
                    location: {
                        helpLocType: HelpLocType.TRAY,
                    }
                }, {
                    text: 'Map',
                    skipButtonPresent: false,
                    location: {
                        helpLocType: HelpLocType.MAP_LOWER_LEFT_QUADRANT,
                    }
                }],
                hilights: [{
                    location: {
                        helpLocType: HelpLocType.TRAY_OBJECT,
                        locObjectId: '$objectId',
                        locObjectType: ObjectType.TRAY_SENSOR,
                    },
                }],
                arrows: [],
            },

            afterDraggedSensorToMap: {
                name: 'afterDraggedSensorToMap',
                balloons: [{
                    text: 'On the Map, a rectangular Sensor Zone is created\n' +
                        'that contains the Sensor you just dragged.\n\n' +
                        'Drag the Sensor Zone into a lane on the Map\n' +
                        'by clicking and dragging inside the rectangle,\n' +
                        'but outside the Sensor circle.\n\n' +
                        'If the Sensor Zone is already placed in a lane,\n' +
                        'just drag it a little bit to see how dragging works.',
                    skipButtonPresent: true,
                    location: {
                        helpLocType: HelpLocType.MAP_OBJECT,
                        locObjectId: '$objectId',
                        locObjectType: ObjectType.SENSOR_ZONE,
                    },
                }],
                hilights: [{
                    location: {
                        helpLocType: HelpLocType.MAP_OBJECT,
                        locObjectId: '$objectId',
                        locObjectType: ObjectType.SENSOR_ZONE,
                    },
                    transformType: TransformType.TRANSLATE,
                }],
                arrows: [],
            },

            // TODO: may need to check that SZ is selected.  it should be,
            //       but might have become unselected.  In which case
            //       Need to prompt user to select it.
            afterMoveSensorZone: {
                name: 'afterMoveSensorZone',
                balloons: [{
                    text: 'Rotate the Sensor Zone rectangle\n' +
                        'to match the direction of traffic in its lane.\n\n' +
                        'Use the rotate handle (small circle) to rotate it.\n\n' +
                        'If the Sensor Zone is already rotated correctly,\n' +
                        'try rotating it just a little to get the feel.',
                    skipButtonPresent: true,
                    location: {
                        helpLocType: HelpLocType.MAP_OBJECT,
                        locObjectId: '$objectId',
                        locObjectType: ObjectType.SENSOR_ZONE,
                    },
                }],
                hilights: [{
                    location: {
                        helpLocType: HelpLocType.MAP_OBJECT,
                        locObjectId: '$objectId',
                        locObjectType: ObjectType.SENSOR_ZONE,
                    },
                    transformType: TransformType.ROTATE,
                }],
                // TODO: would be nice to have an arrow to the rotate handle of the SZ
                arrows: [],
            },

            afterRotateSensorZone: {
                name: 'afterRotateSensorZone',
                balloons: [{
                    text: 'We would like to Save the new configuration\n' +
                        'to the Gateway, but the Save button is Pink,\n' +
                        'meaning something still needs work.\n\n' +
                        'Notice that the Sensor has a red star after it,\n' +
                        'and that the Info Panel says Sensor $objectId \n' +
                        'needs RF Link to Radio or Repeater.\n\n' +
                        'So drag the Sensor to a Radio\n' +
                        'or Repeater to create its RF Link.',
                    skipButtonPresent: true,
                    location: {
                        helpLocType: HelpLocType.MAP_OBJECT,
                        locObjectId: '$objectId',
                        locObjectType: ObjectType.MAP_SENSOR,
                    },
                }],
                hilights: [{
                    location: {
                        helpLocType: HelpLocType.MAP_OBJECT,
                        locObjectId: '$objectId',
                        locObjectType: ObjectType.MAP_SENSOR,
                    },
                }],
                arrows: [],
            },

            afterCreatedRfLink: {
                name: 'afterCreatedRfLink',
                balloons: [{
                    text: 'Notice that there is now a light blue line between\n' +
                        'the Sensor and the Radio or Repeater.\n' +
                        'That light blue line represents the RF link.\n\n' +
                        'You can change that line into 2 line segments\n' +
                        'by clicking anywhere on the line and dragging.\n' +
                        '(This optional step can be repeated multiple times.)\n\n' +
                        'Give it a try...',
                    skipButtonPresent: true,
                    location: {
                        helpLocType: HelpLocType.BUTTON_TOP_BAR,
                        locObjectId: 'save',
                        locObjectType: ObjectType.BUTTON_TOP_BAR,
                    },
                }],
                hilights: [],
                arrows: [],
            },

            afterChangedRfLink: {
                name: 'afterChangedRfLink',
                balloons: [{
                    text: 'The Red star is now gone from the Sensor.\n\n' +
                        'If the Save button remains Pink,\n' +
                        'check for any other devices with a Red star.\n' +
                        'If there are any, click on each of them and fix their reported problems.\n\n' +
                        'Click on the Save button when it is Green\n' +
                        'to save the configuration you have made to the Gateway.',
                    skipButtonPresent: true,
                    location: {
                        helpLocType: HelpLocType.BUTTON_TOP_BAR,
                        locObjectId: 'save',
                        locObjectType: ObjectType.BUTTON_TOP_BAR,
                    },
                }],
                hilights: [{
                    location: {
                        helpLocType: HelpLocType.BUTTON_TOP_BAR,
                        locObjectId: 'save',
                        locObjectType: ObjectType.BUTTON_TOP_BAR,
                    }
                }],
                arrows: [],
            },

            // following is final state right now.
            afterSaveClicked: {
                name: 'afterSaveClicked',
                balloons: [{
                    text: "You've done it!\n" +
                        "You've initiated a save of the new configuration to the Gateway.\n\n" +
                        "When Save button turns gray and the save progress bar disappears,\n" +
                        "the Save is done.",
                    skipButtonPresent: false,
                    location: {
                        helpLocType: HelpLocType.BUTTON_TOP_BAR,
                        locObjectId: 'save',
                        locObjectType: ObjectType.BUTTON_TOP_BAR,
                    },
                }],
                hilights: [],
                arrows: [],
                final: true,
            },

            anotherFinalState: {
                name: 'noMoreHelp',
                balloons: [{
                    text: "You have reached the end of the initial Help Tutorial.",
                    skipButtonPresent: false,
                    location: {
                        helpLocType: HelpLocType.MAP_UPPER_LEFT_QUADRANT,
                        locObjectId: 'save',
                        locObjectType: ObjectType.AP,
                    },
                }],
                hilights: [],
                arrows: [],
                final: true,
            },
        },

        gestureByName: {
            'move Sensor to Map': {
                type: GestureType.UNDOABLE_GESTURE,
                id: 'move Sensor to Map',
            },
            'remove Sensor from Map': {
                type: GestureType.UNDOABLE_GESTURE,
                id: 'remove Sensor from Map',
            },
            'move Sensor Zone': {
                type: GestureType.UNDOABLE_GESTURE,
                id: 'move Sensor Zone',
            },
            'rotate Sensor Zone': {
                type: GestureType.UNDOABLE_GESTURE,
                id: 'rotate Sensor Zone',
            },
            "create RF Link to Radio or Repeater": {
                type: GestureType.UNDOABLE_GESTURE,
                id: "create RF Link to Radio or Repeater",
            },
            'move rf link': {
                type: GestureType.UNDOABLE_GESTURE,
                id: 'move rf link',
            },
            'startScan': {
                type: GestureType.BUTTON_PRESS,
                id: 'startScan',
            },
            'save': {
                type: GestureType.BUTTON_PRESS,
                id: 'save',
            },
            'skip': {
                type: GestureType.BUTTON_PRESS,
                id: 'skip',
            }
        },
    };

    /*
    constructor() {
        this.stateMachine = this.initStateMachine();
    }

    private initStateMachine(): StateMachine {
        return helpPathData;
    }
    */

    public getStateMachine(): StateMachine {
        return this.stateMachine;
    }
}
