import { getPlausibleStats } from "@/lib/getPlausibleStats";
import { NextResponse } from "next/server";
import { requireProAccess } from "@/lib/proCheck";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "7d";

  // Pro-Status-Überprüfung
  const authResult = await requireProAccess();
  if (authResult instanceof Response) {
    return authResult;
  }

  const { profile } = authResult;

  try {
    // Get comprehensive stats including time-series and breakdown data
    const stats = await getPlausibleStats({
      userSlug: profile.username,
      metrics: ["pageviews", "visitors", "visit_duration"],
      dateRange: range,
      dimensions: ["time:day"], // This will trigger both main and secondary data
    });

    if (!stats || !stats.data) {
      return NextResponse.json({
        pageViews: 0,
        visitors: 0,
        avgVisitDuration: 0,
        chartData: [],
        deviceData: [],
        browserData: [],
        countryData: [],
        sourceData: [],
        pageData: [],
      });
    }

    // Process main metrics over time
    let totalPageViews = 0;
    let totalVisitors = 0;
    let totalVisitDuration = 0;
    let dayCount = 0;

    const chartData = [];

    for (const metric of stats.data) {
      const [date] = metric.dimensions;
      const [pageviews, visitors, visitDuration] = metric.metrics;

      totalPageViews += pageviews;
      totalVisitors += visitors;
      totalVisitDuration += visitDuration;
      dayCount++;

      chartData.push({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
        }),
        views: pageviews,
        visitors: visitors,
        visitDuration: visitDuration,
      });
    }

    const avgVisitDuration = dayCount > 0 ? totalVisitDuration / dayCount : 0;

    // Process breakdown data
    const deviceMap = {};
    const browserMap = {};
    const countryMap = {};
    const sourceMap = {};
    const pageMap = {};

    if (stats.secondaryData && Array.isArray(stats.secondaryData)) {
      for (const item of stats.secondaryData) {
        const dimensions = item.dimensions || [];
        const metrics = item.metrics || [];
        const [device, browser, country, source, page] = dimensions;
        const [pageviews = 0, visitors = 0, visitDuration = 0] = metrics;

        // Group by device
        if (device) {
          const deviceKey = device === "Laptop" ? "Desktop" : device;
          if (!deviceMap[deviceKey])
            deviceMap[deviceKey] = { visitors: 0, pageviews: 0 };
          deviceMap[deviceKey].visitors += visitors;
          deviceMap[deviceKey].pageviews += pageviews;
        }

        // Group by browser
        if (browser) {
          if (!browserMap[browser])
            browserMap[browser] = { visitors: 0, pageviews: 0 };
          browserMap[browser].visitors += visitors;
          browserMap[browser].pageviews += pageviews;
        }

        // Group by country
        if (country) {
          if (!countryMap[country])
            countryMap[country] = { visitors: 0, pageviews: 0 };
          countryMap[country].visitors += visitors;
          countryMap[country].pageviews += pageviews;
        }

        // Group by source
        if (source) {
          const sourceName = source === "(Direct)" ? "Direct" : source;
          if (!sourceMap[sourceName])
            sourceMap[sourceName] = { visitors: 0, pageviews: 0 };
          sourceMap[sourceName].visitors += visitors;
          sourceMap[sourceName].pageviews += pageviews;
        }

        // Group by page
        if (page) {
          if (!pageMap[page])
            pageMap[page] = {
              visitors: 0,
              pageviews: 0,
              visitDuration: 0,
              count: 0,
            };
          pageMap[page].visitors += visitors;
          pageMap[page].pageviews += pageviews;
          pageMap[page].visitDuration += visitDuration;
          pageMap[page].count += 1;
        }
      }
    }

    // Format data for frontend
    const deviceData = Object.entries(deviceMap)
      .map(([name, data]) => ({
        name,
        visitors: data.visitors,
        value:
          totalVisitors > 0
            ? Math.round((data.visitors / totalVisitors) * 100)
            : 0,
        color:
          name === "Desktop"
            ? "#3B82F6"
            : name === "Mobile"
            ? "#10B981"
            : "#F59E0B",
      }))
      .sort((a, b) => b.visitors - a.visitors);

    const browserData = Object.entries(browserMap)
      .map(([name, data]) => ({
        name,
        visitors: data.visitors,
        value:
          totalVisitors > 0
            ? Math.round((data.visitors / totalVisitors) * 100)
            : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 8);

    const countryData = Object.entries(countryMap)
      .map(([name, data]) => ({
        country: name,
        visitors: data.visitors,
        percentage:
          totalVisitors > 0
            ? Math.round((data.visitors / totalVisitors) * 100)
            : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 8);

    const sourceData = Object.entries(sourceMap)
      .map(([name, data]) => ({
        source: name,
        visitors: data.visitors,
        percentage:
          totalVisitors > 0
            ? Math.round((data.visitors / totalVisitors) * 100)
            : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 8);

    const pageData = Object.entries(pageMap)
      .map(([name, data]) => ({
        page: name,
        views: data.pageviews,
        visitors: data.visitors,
        avgTime:
          data.count > 0 ? Math.round(data.visitDuration / data.count) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    return NextResponse.json({
      pageViews: totalPageViews,
      visitors: totalVisitors,
      avgVisitDuration: avgVisitDuration,
      chartData,
      deviceData,
      browserData,
      countryData,
      sourceData,
      pageData,
    });
  } catch (error) {
    console.error("Plausible API Error:", error);
    return NextResponse.json({
      pageViews: 0,
      visitors: 0,
      avgVisitDuration: 0,
      chartData: [],
      deviceData: [],
      browserData: [],
      countryData: [],
      sourceData: [],
      pageData: [],
    });
  }
}
