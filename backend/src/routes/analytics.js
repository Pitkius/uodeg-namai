import express from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest } from "../utils/httpError.js";
import { DailyTraffic, VisitorDay } from "../models/Analytics.js";
import { User } from "../models/User.js";
import { Reservation } from "../models/Reservation.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { ChatThread } from "../models/Chat.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { visitLimiter } from "../utils/rateLimits.js";

export const analyticsRouter = express.Router();

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Local calendar day key (server timezone — Hostinger LT). */
export function dateKeyFromDate(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function daysAgoKey(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return dateKeyFromDate(d);
}

const trackSchema = z.object({
  path: z.string().trim().max(200).optional(),
  visitorId: z.string().trim().min(8).max(64)
});

analyticsRouter.post(
  "/visit",
  visitLimiter,
  asyncHandler(async (req, res) => {
    const parsed = trackSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Neteisingi analitikos duomenys");

    const path = String(parsed.data.path || "/").slice(0, 200);
    // Do not inflate stats with admin panel browsing
    if (path.startsWith("/admin")) {
      return res.json({ ok: true, skipped: true });
    }

    const visitorId = parsed.data.visitorId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    if (visitorId.length < 8) throw badRequest("Neteisingas visitorId");

    const dateKey = dateKeyFromDate();

    await DailyTraffic.updateOne({ dateKey }, { $inc: { pageViews: 1 } }, { upsert: true });
    try {
      await VisitorDay.create({ dateKey, visitorId });
    } catch (e) {
      if (e?.code !== 11000) throw e;
    }

    res.json({ ok: true });
  })
);

function buildGrowthTips({
  todayViews,
  todayVisitors,
  avgVisitors7,
  usersTotal,
  registrations7,
  reservationsPending,
  chatOpen
}) {
  const tips = [];

  if (avgVisitors7 < 5) {
    tips.push({
      title: "Daugiau vietinio matomumo",
      body: "Sukurkite / atnaujinkite Google Business profilį su nuotraukomis, darbo valandomis ir nuoroda į rezervacijas. Daug žmonių ieško „gyvūnų viešbutis“ būtent per Google Maps."
    });
  }

  if (todayViews < 20 || avgVisitors7 < 10) {
    tips.push({
      title: "Dalinkitės Facebook / Instagram",
      body: "Kartą per savaitę įkelkite tikrą augintinio istoriją + nuorodą „Užsiregistruoti online“. Trumpas video ar prieš/po nuotraukos veikia geriau nei tik tekstas."
    });
  }

  if (registrations7 < 3 && usersTotal < 50) {
    tips.push({
      title: "Lengvesnė registracija",
      body: "Pirmame puslapyje aiškiai parodykite CTA „Rezervuoti nakvynę“ ir kad užtruksite 1 minutę. Trumpas pasiūlymas naujiems (pvz. pirma nakvynė) skatina registruotis."
    });
  }

  if (reservationsPending > 0) {
    tips.push({
      title: "Greitas atsakymas = daugiau užsakymų",
      body: `Dabar laukia ${reservationsPending} rezervacijų. Greitas patvirtinimas ir žinutė per chat didina pasitikėjimą ir rekomendacijas.`
    });
  }

  if (chatOpen > 0) {
    tips.push({
      title: "Atsakykite į žinutes",
      body: `Yra ${chatOpen} atvirų pokalbių. Žmonės dažnai klausia prieš rezervuodami — greitas atsakymas kelia konversiją.`
    });
  }

  tips.push({
    title: "SEO: vietiniai raktažodžiai",
    body: "Naudokite frazes „gyvūnų viešbutis“, miesto pavadinimą ir „augintinių nakvynė“ Google Business, Instagram bio ir svetainės antraštėse. Prašykite patenkintų klientų palikti atsiliepimą."
  });

  tips.push({
    title: "Partnerystės",
    body: "Susitarkite su veterinarijos klinikomis, groomeriais ar cynologais — plakatas ar QR kodas į rezervacijas atveda nuolatinius klientus."
  });

  if (todayVisitors >= 15) {
    tips.push({
      title: "Šiandien srautas geras",
      body: "Pasinaudokite: atsakykite greitai į chat ir patvirtinkite rezervacijas, kad lankytojai greičiau taps klientais."
    });
  }

  return tips.slice(0, 6);
}

analyticsRouter.get(
  "/admin/summary",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const days = 30;
    const keys = [];
    for (let i = days - 1; i >= 0; i -= 1) keys.push(daysAgoKey(i));

    const todayKey = dateKeyFromDate();
    const weekKeys = keys.slice(-7);

    const [trafficRows, visitorCounts, usersTotal, usersWeek, reservationsTotal, reservationsPending, chatOpen, contactUnread] =
      await Promise.all([
        DailyTraffic.find({ dateKey: { $in: keys } }).lean(),
        VisitorDay.aggregate([
          { $match: { dateKey: { $in: keys } } },
          { $group: { _id: "$dateKey", uniqueVisitors: { $sum: 1 } } }
        ]),
        User.countDocuments({ role: { $ne: "admin" } }),
        User.countDocuments({
          role: { $ne: "admin" },
          createdAt: { $gte: (() => {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            d.setHours(0, 0, 0, 0);
            return d;
          })() }
        }),
        Reservation.countDocuments({ status: { $in: ["pending", "confirmed"] } }),
        Reservation.countDocuments({ status: "pending" }),
        ChatThread.countDocuments({ status: "open" }),
        ContactMessage.countDocuments({ isRead: false })
      ]);

    const trafficMap = new Map(trafficRows.map((r) => [r.dateKey, r.pageViews || 0]));
    const visitorMap = new Map(visitorCounts.map((r) => [r._id, r.uniqueVisitors || 0]));

    const series = keys.map((dateKey) => ({
      dateKey,
      pageViews: trafficMap.get(dateKey) || 0,
      uniqueVisitors: visitorMap.get(dateKey) || 0
    }));

    const today = series.find((s) => s.dateKey === todayKey) || { pageViews: 0, uniqueVisitors: 0 };
    const last7 = series.filter((s) => weekKeys.includes(s.dateKey));
    const sumViews7 = last7.reduce((a, s) => a + s.pageViews, 0);
    const sumVisitors7 = last7.reduce((a, s) => a + s.uniqueVisitors, 0);
    const avgVisitors7 = Math.round((sumVisitors7 / 7) * 10) / 10;

    const totalsAllTimeViews = await DailyTraffic.aggregate([
      { $group: { _id: null, pageViews: { $sum: "$pageViews" } } }
    ]);
    const totalsAllTimeVisitors = await VisitorDay.countDocuments({});

    const tips = buildGrowthTips({
      todayViews: today.pageViews,
      todayVisitors: today.uniqueVisitors,
      avgVisitors7,
      usersTotal,
      registrations7: usersWeek,
      reservationsPending,
      chatOpen
    });

    res.json({
      today: {
        dateKey: todayKey,
        pageViews: today.pageViews,
        uniqueVisitors: today.uniqueVisitors
      },
      last7Days: {
        pageViews: sumViews7,
        uniqueVisitors: sumVisitors7,
        avgUniqueVisitorsPerDay: avgVisitors7
      },
      allTime: {
        pageViews: totalsAllTimeViews[0]?.pageViews || 0,
        uniqueVisitorDays: totalsAllTimeVisitors
      },
      users: {
        registeredTotal: usersTotal,
        registeredLast7Days: usersWeek
      },
      activity: {
        activeReservations: reservationsTotal,
        pendingReservations: reservationsPending,
        openChats: chatOpen,
        unreadContactMessages: contactUnread
      },
      series,
      tips
    });
  })
);
