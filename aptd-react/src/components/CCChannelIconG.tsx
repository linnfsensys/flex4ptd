import React from 'react';
import { ObjectType } from '../AptdClientTypes';
import { ChannelNumber } from '../AptdServerTypes';
import './CCChannelIconG.css';

interface CCChannelIconGProps {
  id: string;
  channelKey: string;
  channelNo: ChannelNumber;
  disabled: boolean;
  detect: boolean;
  height: number;
  x: number;
  y: number;
  onMouseDown?: (event: React.MouseEvent<SVGGElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<SVGGElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<SVGGElement>) => void;
}

const CCChannelIconG: React.FC<CCChannelIconGProps> = ({
  id,
  channelKey,
  channelNo,
  disabled,
  detect,
  height,
  x,
  y,
  onMouseDown,
  onMouseEnter,
  onMouseLeave
}) => {
  // 将通道号转换为整数
  const toInt = (channelNo: ChannelNumber): number => {
    return +(channelNo.substr(3));
  };

  const channelIconWidth = 28;
  const channelIconHeight = height;
  
  let rectClassNames = 'ccChannelRect';
  if (disabled) {
    rectClassNames += ' disabled';
  }
  if (detect) {
    rectClassNames += ' detected';
  }
  
  const transform = `translate(${x}, ${y})`;
  const channelNumber = toInt(channelNo);

  return (
    <g 
      className={`ccChannelG dotid-${channelKey}`}
      transform={transform}
      data-dotid={channelKey}
      data-devicetype="CC_CHANNEL"
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* rect lozenge represents a channel */}
      <rect 
        className={rectClassNames}
        height={channelIconHeight}
        width={channelIconWidth}
        rx={3}
      />
      <text className="channelText" x="12" y="7">
        {`Ch ${channelNumber}`}
      </text>
    </g>
  );
};

export default CCChannelIconG; 