import { motion } from "framer-motion";

const WaterBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Base subtle gradient */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Water blobs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07]"
        style={{
          background: "radial-gradient(circle, hsl(160 50% 40%), transparent 70%)",
          top: "-10%",
          left: "20%",
          filter: "blur(80px)",
        }}
        animate={{
          x: [0, 15, -10, 8, 0],
          y: [0, -10, 8, -15, 0],
          rotate: [0, 2, -1, 1, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, hsl(160 40% 30%), transparent 70%)",
          bottom: "5%",
          right: "-5%",
          filter: "blur(100px)",
        }}
        animate={{
          x: [0, -20, 12, -8, 0],
          y: [0, 10, -8, 15, 0],
          rotate: [0, -2, 1.5, -1, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, hsl(160 45% 35%), transparent 70%)",
          top: "40%",
          left: "-8%",
          filter: "blur(90px)",
        }}
        animate={{
          x: [0, 10, -15, 5, 0],
          y: [0, -12, 6, -10, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Water texture overlay - flowing lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="water-pattern" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <motion.path
              d="M0,100 Q50,80 100,100 Q150,120 200,100"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              className="text-primary"
              animate={{ d: [
                "M0,100 Q50,80 100,100 Q150,120 200,100",
                "M0,100 Q50,120 100,100 Q150,80 200,100",
                "M0,100 Q50,80 100,100 Q150,120 200,100",
              ]}}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              d="M0,50 Q50,30 100,50 Q150,70 200,50"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              className="text-primary"
              animate={{ d: [
                "M0,50 Q50,30 100,50 Q150,70 200,50",
                "M0,50 Q50,70 100,50 Q150,30 200,50",
                "M0,50 Q50,30 100,50 Q150,70 200,50",
              ]}}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              d="M0,150 Q50,130 100,150 Q150,170 200,150"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              className="text-primary"
              animate={{ d: [
                "M0,150 Q50,130 100,150 Q150,170 200,150",
                "M0,150 Q50,170 100,150 Q150,130 200,150",
                "M0,150 Q50,130 100,150 Q150,170 200,150",
              ]}}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#water-pattern)" />
      </svg>
    </div>
  );
};

export default WaterBackground;
