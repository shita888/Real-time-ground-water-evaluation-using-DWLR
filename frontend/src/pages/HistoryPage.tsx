import React, { useState } from "react";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import AppSidebar from "@/components/ui/AppSidebar";
import HistoryViewer from "@/components/HistoryViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Calendar, CheckCircle2, ShieldCheck, Database } from "lucide-react";

const HistoryPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col text-slate-900">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex flex-1 w-full min-w-0">
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                    <History className="h-3 w-3 mr-1 inline" /> Historical Archives
                  </Badge>
                  <Badge variant="outline" className="border-slate-300 text-slate-600">
                    1994 – 2024 Records
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Historical Groundwater Records
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm md:text-base mt-1">
                  Detailed time-series telemetry observations across 2,453 DWLR stations in Madhya Pradesh, decoupled from forecast limits.
                </p>
              </div>

              {/* Key Specs Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs text-slate-700">
                  <Database className="h-4 w-4 text-purple-600" />
                  <span>Observations: <b>134,104 Records</b></span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Zero-Fill Protection: <b>Enforced</b></span>
                </div>
              </div>
            </div>

            {/* Main Interactive History Viewer */}
            <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm ring-1 ring-slate-200/60 overflow-hidden">
              <CardContent className="p-2 sm:p-6">
                <HistoryViewer />
              </CardContent>
            </Card>

            {/* Feature Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Forecast Independence
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  Unlike the ML forecast engine which strictly requires $\ge 15$ observations, historical analysis retrieves all valid recorded data points without artificial constraints.
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Flexible Time Horizons
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  Toggle between 7-day, 15-day, 30-day, 90-day, and multi-season observation windows to trace short-term water table recoveries or long-term depletion patterns.
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <Database className="h-4 w-4 text-purple-600" />
                    Data Provenance
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  Records originate from Central Ground Water Board (CGWB) telemetry loggers and Madhya Pradesh Water Resources Department monitoring wells.
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default HistoryPage;

