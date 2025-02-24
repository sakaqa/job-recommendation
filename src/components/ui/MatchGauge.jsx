import React from 'react';

const MatchGauge = ({ percentage, size = 'medium' }) => {
  // Calculate the circle's circumference and stroke-dasharray
  const radius = size === 'small' ? 23 : 27;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = size === 'small' ? 4 : 6;
  const viewBoxSize = (radius + strokeWidth) * 2;
  
  // Calculate the stroke-dashoffset based on the percentage
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={viewBoxSize}
        height={viewBoxSize}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      >
        {/* Background circle */}
        <circle
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          r={radius}
          className="stroke-gray-200"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Foreground circle */}
        <circle
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          r={radius}
          className="stroke-blue-500"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: dashOffset,
            transition: 'stroke-dashoffset 0.5s ease'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-semibold ${size === 'small' ? 'text-sm' : 'text-lg'}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
};

export default MatchGauge;