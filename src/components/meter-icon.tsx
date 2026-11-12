import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { Meter } from '@game/index';

interface Props {
  meter: Meter;
  color: string;
  size?: number;
}

export function MeterIcon({ meter, color, size = 22 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {meter === 'cash' && (
        <>
          <Rect x={2.5} y={6} width={19} height={12} rx={2} stroke={color} strokeWidth={2} />
          <Circle cx={12} cy={12} r={2.8} stroke={color} strokeWidth={2} />
          <Path d="M6 9v6M18 9v6" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
      {meter === 'hype' && (
        <Path
          d="M12 2.5c.6 3.4 4.8 5.6 4.8 10.2A4.8 4.8 0 0 1 12 17.5a4.8 4.8 0 0 1-4.8-4.8c0-2 1-3.5 2.2-4.6.2 1.6.9 2.6 1.9 3.1C11 8.8 11 5.4 12 2.5Z M8.2 20.5h7.6"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {meter === 'stable' && (
        <>
          <Path
            d="M7 9.5a5 5 0 0 1 10 0v4.5a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V9.5Z"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Path d="M9.5 17v3.5h5V17M7 11.5h3.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
      {meter === 'rep' && (
        <Path
          d="M3 9.5 12 4l9 5.5M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20.5h18"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}
