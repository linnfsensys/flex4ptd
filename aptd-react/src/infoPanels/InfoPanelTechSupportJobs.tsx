import React from 'react';
import './InfoPanelTechSupport.css';
import {EnactType, ActionGroup} from "../AptdClientTypes";
import {GUITechSupport} from "../AptdServerTypes";


interface InfoPanelTechSupportJobsProps {
     techSupportModel: GUITechSupport | null,
    enactXactsToStore: (actionGroup:ActionGroup, enactType:EnactType)=>void
}


/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelTechSupportJobs extends React.Component<InfoPanelTechSupportJobsProps> {

    constructor(props: InfoPanelTechSupportJobsProps) {
        super(props);
        console.debug('lifecycle InfoPanelTechSupport constructor(): start');
    }


    render() {
        let theJobs =  this.props.techSupportModel!.jobs;
        return (
            <div id='infoTechSupportJobs'>
                <div id='techSupportJobsForm'>
                    <table>
                        <thead>
                        <tr>
                            <th align="left">Name</th>
                            <th align="left">Interval</th>
                            <th align="left">Num Runs</th>
                        </tr>
                        </thead>
                        <tbody>
                        {theJobs.map(item => {
                            return <tr key={item.name}>
                                <td>{item.name}</td>
                                <td>{item.interval}</td>
                                <td>{item.numRuns}</td>
                            </tr>
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }
}

export default InfoPanelTechSupportJobs;