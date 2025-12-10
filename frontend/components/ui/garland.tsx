"use client"

export default function Garland() {
  return (
    <div id="Christmas_Lights" className="fixed left-0 right-0 pointer-events-none h-[120px]" style={{ zIndex: 1000, top: -16 }}>
      <svg width="100%" height="100%" viewBox="0 0 1200 150" preserveAspectRatio="xMidYMin meet">
        <path d="M0,30 C300,110 900,10 1200,90" className="light_cord" strokeWidth="3" fill="none" />
        <g>
          <g className="garland-sway" style={{ transformOrigin: '60px 25px', animationDelay: '0s' }}>
            <rect x="56" y="26" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="60" cy="38" rx="10" ry="14" className="bulb red_bulb blink-1" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '120px 40px', animationDelay: '0.1s' }}>
            <rect x="116" y="41" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="120" cy="54" rx="10" ry="14" className="bulb blue_bulb blink-2" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '180px 58px', animationDelay: '0.2s' }}>
            <rect x="176" y="59" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="180" cy="72" rx="10" ry="14" className="bulb white_bulb blink-3" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '240px 76px', animationDelay: '0.3s' }}>
            <rect x="236" y="77" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="240" cy="90" rx="10" ry="14" className="bulb green_bulb blink-4" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '300px 92px', animationDelay: '0.4s' }}>
            <rect x="296" y="93" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="300" cy="106" rx="10" ry="14" className="bulb gold_bulb blink-5" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '360px 98px', animationDelay: '0.5s' }}>
            <rect x="356" y="99" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="360" cy="112" rx="10" ry="14" className="bulb green_bulb blink-6" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '420px 92px', animationDelay: '0.6s' }}>
            <rect x="416" y="93" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="420" cy="106" rx="10" ry="14" className="bulb red_bulb blink-7" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '480px 80px', animationDelay: '0.7s' }}>
            <rect x="476" y="81" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="480" cy="94" rx="10" ry="14" className="bulb blue_bulb blink-8" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '540px 66px', animationDelay: '0.8s' }}>
            <rect x="536" y="67" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="540" cy="80" rx="10" ry="14" className="bulb white_bulb blink-9" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '600px 54px', animationDelay: '0.9s' }}>
            <rect x="596" y="55" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="600" cy="68" rx="10" ry="14" className="bulb green_bulb blink-10" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '660px 46px', animationDelay: '1s' }}>
            <rect x="656" y="47" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="660" cy="60" rx="10" ry="14" className="bulb gold_bulb blink-1" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '720px 46px', animationDelay: '1.1s' }}>
            <rect x="716" y="47" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="720" cy="60" rx="10" ry="14" className="bulb green_bulb blink-2" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '780px 54px', animationDelay: '1.2s' }}>
            <rect x="776" y="55" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="780" cy="68" rx="10" ry="14" className="bulb red_bulb blink-3" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '840px 68px', animationDelay: '1.3s' }}>
            <rect x="836" y="69" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="840" cy="82" rx="10" ry="14" className="bulb blue_bulb blink-4" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '900px 82px', animationDelay: '1.4s' }}>
            <rect x="896" y="83" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="900" cy="96" rx="10" ry="14" className="bulb white_bulb blink-5" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '960px 95px', animationDelay: '1.5s' }}>
            <rect x="956" y="96" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="960" cy="109" rx="10" ry="14" className="bulb green_bulb blink-6" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '1020px 102px', animationDelay: '1.6s' }}>
            <rect x="1016" y="103" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="1020" cy="116" rx="10" ry="14" className="bulb gold_bulb blink-7" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '1080px 106px', animationDelay: '1.7s' }}>
            <rect x="1076" y="107" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="1080" cy="120" rx="10" ry="14" className="bulb green_bulb blink-8" />
          </g>
          <g className="garland-sway" style={{ transformOrigin: '1140px 107px', animationDelay: '1.8s' }}>
            <rect x="1136" y="108" width="8" height="8" rx="2" className="light_fixture" />
            <ellipse cx="1140" cy="121" rx="10" ry="14" className="bulb red_bulb blink-9" />
          </g>
        </g>
      </svg>
    </div>
  )
}
