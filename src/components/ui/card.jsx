import MatchGauge from './MatchGauge';

export function Card({ children, className, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative border p-4 rounded-lg shadow-md bg-white hover:shadow-lg transition ${className}`}
    >
      {children}
    </div>
  );
}