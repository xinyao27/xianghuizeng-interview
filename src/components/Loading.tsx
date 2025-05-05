
interface LoadingProps {
  size?: number;
}

const Loading = ({ size = 40 }: LoadingProps) => {
  return (
    <div className="flex items-center justify-center">
      <div
        className="relative flex justify-center"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="absolute bottom-0 h-1 w-1 rounded-full bg-primary opacity-0"
            style={{
              left: `${(index * 10) + (size - 30) / 2}px`,
              animation: `dotAnimation 1.5s infinite ${index * 0.2}s`,
            }}
          />
        ))}
      </div>
      <style jsx global>{`
        @keyframes dotAnimation {
          0% {
            opacity: 0;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
          }
          70% {
            opacity: 0.5;
          }
          100% {
            opacity: 0;
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;
