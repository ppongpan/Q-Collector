import React from 'react';
import { getPhoneIconProps } from '../../utils/phoneFormatter.js';

export const PhoneIcon = ({ className, ...props }) => {
  const iconProps = getPhoneIconProps();

  return (
    <svg
      className={className || iconProps.className}
      fill={iconProps.fill}
      stroke={iconProps.stroke}
      viewBox={iconProps.viewBox}
      aria-hidden={iconProps['aria-hidden']}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={iconProps.path}
      />
    </svg>
  );
};