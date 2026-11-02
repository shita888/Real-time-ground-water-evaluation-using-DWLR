import React, { useState } from "react";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import AppSidebar from "@/components/ui/AppSidebar";
import ForecastViewer from "@/components/ForecastViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Cpu, Sparkles, AlertCircle, Info, Database } from "lucide-react";

const ForecastPage: React.FC = () => {
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
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    <Sparkles className="h-3 w-3 mr-1 inline" /> Deep Learning ML
                  </Badge>
                  <Badge variant="outline" className="border-slate-300 text-slate-600">
                    7-Day Horizon
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Groundwater Level Forecasting
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm md:text-base mt-1">
                  Predictive recursive aquifer depletion forecasting using trained LSTM neural networks across Madhya Pradesh DWLR stations.
                </p>
              </div>

              {/* Key Specs Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs text-slate-700">
                  <Cpu className="h-4 w-4 text-blue-600" />
                  <span>Model: <b>LSTM (19k params)</b></span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs text-slate-700">
                  <Database className="h-4 w-4 text-cyan-600" />
                  <span>Min Requirement: <b>15 obs</b></span>
                </div>
              </div>
            </div>

            {/* Main Interactive Forecast Viewer */}
            <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm ring-1 ring-slate-200/60 overflow-hidden">
              <CardContent className="p-2 sm:p-6">
                <ForecastViewer />
              </CardContent>
            </Card>

            {/* Model Architecture & Quality Guard Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Recursive Forward Projection
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  The model takes the last 15 historical telemetry observations, scales them via MinMaxScaler, and generates step-by-step predictions for $t+1 \dots t+7$ recursively.
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    Strict Data Quality Gate
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  Stations with fewer than 15 valid readings raise an Insufficient Data warning (HTTP 422) rather than fabricating zero-depth dummy values, preserving physical scientific integrity.
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <Info className="h-4 w-4 text-teal-600" />
                    CGWB Stage Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  Outputs are categorized into Central Ground Water Board stages: Safe (&lt;10 mbgl), Semi-Critical (10-20 mbgl), Critical (20-40 mbgl), and Over-Exploited (&gt;40 mbgl).
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

export default ForecastPage;

