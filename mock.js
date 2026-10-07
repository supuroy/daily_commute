// Test-only: open index.html?mock to run against fake API data (no network, no key needed).
(() => {
  const now = Date.now();
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const svc = d0.getTime();
  const secOf = (ms) => Math.round((ms - svc) / 1000);
  const min = (n) => now + n * 60000;
  const ok = (entry, references = {}) => ({ code: 200, data: { entry, list: entry, references } });
  const arr = (route, head, stop, trip, t, live) => ({
    routeShortName: route, tripHeadsign: head, tripId: trip, serviceDate: svc, stopId: stop,
    predicted: live, predictedArrivalTime: live ? t : 0, scheduledArrivalTime: t - (live ? 60000 : 0),
    predictedDepartureTime: live ? t : 0, scheduledDepartureTime: t - (live ? 60000 : 0),
  });
  const A = "1_14070", B = "1_14060";
  const routes = {
    // NW-bound pole (configured) only shows Ballard-bound buses
    [A]: [arr("24", "Magnolia", A, "t_nw1", min(3), true), arr("D Line", "Ballard", A, "t_nw2", min(7), true)],
    [B]: [
      arr("24", "Downtown Seattle", B, "t1", min(2), true),
      arr("D Line", "Downtown Seattle", B, "t2", min(6), true),
      arr("33", "Downtown Seattle", B, "t3", min(11), false),
      arr("D Line", "Downtown Seattle", B, "t4", min(14), false),
    ],
    // Inbound 545 departures from Bear Creek P&R (morning "I'm on the 545" picker)
    "1_81755": [arr("545", "Redmond", "1_81755", "o0", min(0), true),   // outbound bus ending here: must NOT be offered
      arr("545", "Downtown Seattle", "1_81755", "i0", min(-1), true), arr("545", "Downtown Seattle", "1_81755", "i1", min(14), false)],
    // Northbound 3rd Ave stops for the "To office" tab
    "1_590": [arr("24", "West Magnolia", "1_590", "n1", min(5), true), arr("33", "E Magnolia", "1_590", "n2", min(12), false)],
    "1_575": [arr("D Line", "Ballard Uptown", "1_575", "n3", min(8), true), arr("D Line", "Ballard Uptown", "1_575", "n4", min(15), true)],
  };
  const nRide = { n1: 11, n2: 10, n3: 14, n4: 14 };   // minutes from the 3rd Ave stop to Elliott & Prospect
  const rideMin = { t1: 14, t2: 10, t3: 12, t4: 10 };
  const westlake = [4, 12, 20, 33, 45].map((m, i) => arr("545", "Redmond", "1_700", "w" + i, min(m + 12), i % 2 === 0));
  westlake.push(arr("550", "Bellevue", "1_700", "x1", min(9), true));

  window.__mockFetch = async (url) => {
    await new Promise((r) => setTimeout(r, 120));
    const u = new URL(url);
    const p = u.pathname.replace(/^.*\/where\//, "").replace(/\.json$/, "");
    let body;
    if (p === "stop/" + A) body = ok({ id: A, name: "Elliott Ave W & W Prospect St", direction: "NW", lat: 47.6309, lon: -122.3766 });
    else if (p === "stops-for-location") body = ok([
      { id: A, name: "Elliott Ave W & W Prospect St", direction: "NW", lat: 47.6309, lon: -122.3766 },
      { id: B, name: "Elliott Ave W & W Prospect St", direction: "SE", lat: 47.6308, lon: -122.3764 },
    ]);
    else if (p.startsWith("arrivals-and-departures-for-stop/")) {
      const id = p.split("/")[1];
      body = ok({ arrivalsAndDepartures: id === "1_700" ? westlake : (routes[id] || []) });
    } else if (p.startsWith("trip-details/t")) {
      const id = p.split("/")[1];
      const start = routes[B].find((a) => a.tripId === id);
      const t0 = secOf(start ? start.scheduledArrivalTime : now);
      body = ok({ schedule: { stopTimes: [
        { stopId: B, arrivalTime: t0 }, { stopId: "1_mid", arrivalTime: t0 + 240 },
        { stopId: "1_3P", arrivalTime: t0 + (rideMin[id] || 10) * 60 },
      ] }, status: { predicted: true, scheduleDeviation: 60, nextStop: "1_mid", nextStopTimeOffset: 90 } },
      { stops: [{ id: "1_3P", name: "3rd Ave & Pike St" }, { id: "1_mid", name: "Westlake Ave & 7th" }] });
    } else if (p.startsWith("trip-details/i")) {
      const id = p.split("/")[1];
      const t0 = secOf(routes["1_81755"].find((a) => a.tripId === id).scheduledArrivalTime);
      body = ok({ schedule: { stopTimes: [
        { stopId: "1_81755", arrivalTime: t0 }, { stopId: "1_x1", arrivalTime: t0 + 1500 }, { stopId: "1_x2", arrivalTime: t0 + 2000 },
        { stopId: "1_760", arrivalTime: t0 + 2400 }, { stopId: "1_790", arrivalTime: t0 + 2520 },
      ] }, status: { predicted: true, scheduleDeviation: 0, nextStop: "1_x1", nextStopTimeOffset: 300 } },
      { stops: [{ id: "1_x1", name: "Stewart St & 9th Ave" }, { id: "1_760", name: "5th Ave & Pine St" }] });
    } else if (p.startsWith("trip-details/n")) {
      const id = p.split("/")[1];
      const from = id === "n1" || id === "n2" ? "1_590" : "1_575";
      body = ok({ schedule: { stopTimes: [
        { stopId: from, arrivalTime: 1000 }, { stopId: "1_mid2", arrivalTime: 1300 }, { stopId: "1_14070", arrivalTime: 1000 + nRide[id] * 60 },
      ] } }, { stops: [] });
    } else if (p.startsWith("trip-details/w")) {
      body = ok({ schedule: { stopTimes: [
        { stopId: "1_700", arrivalTime: 0, departureTime: 0 }, { stopId: "1_bc", arrivalTime: 2280, departureTime: 2280 },
      ] } }, { stops: [{ id: "1_bc", name: "Bear Creek Park & Ride" }] });
    } else body = { code: 404, text: "mock: not found " + p };
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  };
})();
