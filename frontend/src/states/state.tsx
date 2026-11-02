import { useEffect } from "react";
import "../css/bootstrap-custom.min.css";
import "../css/base.css";
import "../css/cinder.css";
import "../css/highlight.css";
import Header from "@/components/ui/header";
import React from "react";
import DistrictMap from "@/js/mapsplot";


const States = () => {
  useEffect(() => {
    // Load external scripts
    const scripts = [
      "/js/jquery-1.10.2.min.js",
      "/js/bootstrap-3.0.3.min.js",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.5.18/webfont.js",
      "//api.tiles.mapbox.com/mapbox.js/v2.2.2/mapbox.js",
      "//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js",
      "/js/highlight.pack.js",
      "/js/base.js",
      "https://cdnjs.cloudflare.com/ajax/libs/d3/3.3.0/d3.min.js",
      "/js/mapsplot.tsx",
    ];

    scripts.forEach((src) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    });

    // Initialize Highlight.js after load
    const hljsInterval = setInterval(() => {
      if ((window as any).hljs) {
        (window as any).hljs.initHighlightingOnLoad();
        clearInterval(hljsInterval);
      }
    }, 100);

    // Initialize map after scripts load
    const plotInterval = setInterval(() => {
      if ((window as any).plotStates) {
        (window as any).plotStates("statesmap");
        clearInterval(plotInterval);
      }
    }, 100);

    // Global variable
    (window as any).base_url = "..";

    return () => {
      scripts.forEach((src) => {
        const s = document.querySelector(`script[src="${src}"]`);
        s?.parentNode?.removeChild(s);
      });
      clearInterval(hljsInterval);
      clearInterval(plotInterval);
    };
  }, []);

  return (
    <>
      <Header />
      <div className="col-md-9" role="main">
        <h1>India - State Boundaries</h1>
        {/* <CensusMap type="state" /> */}
        {/* <h1>India - District Data</h1> */}
        <DistrictMap />
      </div>
    </>
  );
};

export default States;
