import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="fixed bottom-6 right-6 z-50 flex items-center">
      <Link
        to="/subscribe"
        className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-sm shadow-xl transition-all hover:scale-105 hover:shadow-2xl no-underline flex items-center gap-2 ring-2 ring-white/50"
      >
        <span>🔔</span> Subscribe for Alerts
      </Link>
    </footer>
  );
};

export default Footer;
