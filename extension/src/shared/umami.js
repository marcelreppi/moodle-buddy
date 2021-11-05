!(function () {
  ;("use strict")
  var t = function (t, e, n) {
      var a = t[e]
      return function () {
        for (var e = [], i = arguments.length; i--; ) e[i] = arguments[i]
        return n.apply(null, e), a.apply(t, e)
      }
    },
    e = function () {
      var t = window.doNotTrack,
        e = window.navigator,
        n = window.external,
        a =
          t ||
          e.doNotTrack ||
          e.msDoNotTrack ||
          (n &&
            "function" == typeof n.msTrackingProtectionEnabled &&
            n.msTrackingProtectionEnabled())
      return !0 === a || 1 === a || "yes" === a || "1" === a
    }
  !(function (n) {
    var a = n.screen,
      i = a.width,
      r = a.height,
      o = n.navigator.language,
      c = n.location,
      s = c.hostname,
      u = c.pathname,
      l = c.search,
      d = n.localStorage,
      f = n.sessionStorage,
      v = n.document,
      p = n.history,
      m = v.querySelector("script[src*='umami']")
    if (m) {
      var h,
        g = function (t) {
          return m && m.getAttribute(t)
        },
        w = process.env.UMAMI_WEBSITE_ID,
        y = "https://umami.moodlebuddy.com",
        S = "false" !== g("data-auto-track"),
        E = g("data-do-not-track"),
        k = g("data-cache"),
        b = g("data-domains"),
        T =
          d.getItem("umami.disabled") ||
          (E && e()) ||
          (b &&
            !b
              .split(",")
              .map(function (t) {
                return t.trim()
              })
              .includes(s)),
        N = y
          ? (h = y) && h.length > 1 && h.endsWith("/")
            ? h.slice(0, -1)
            : h
          : m.src.split("/").slice(0, -1).join("/"),
        j = i + "x" + r,
        q = [],
        I = "" + u + l,
        L = v.referrer,
        O = function (t, e, n) {
          if (!T) {
            var a = "umami.cache",
              i = { website: n, hostname: s, screen: j, language: o, cache: k && f.getItem(a) }
            e &&
              Object.keys(e).forEach(function (t) {
                i[t] = e[t]
              }),
              (function (t, e, n) {
                var a = new XMLHttpRequest()
                a.open("POST", t, !0),
                  a.setRequestHeader("Content-Type", "application/json"),
                  (a.onreadystatechange = function () {
                    4 === a.readyState && n && n(a.response)
                  }),
                  a.send(JSON.stringify(e))
              })(N + "/api/collect", { type: t, payload: i }, function (t) {
                return k && f.setItem(a, t)
              })
          }
        },
        P = function (t, e, n) {
          return (
            void 0 === t && (t = I),
            void 0 === e && (e = L),
            void 0 === n && (n = w),
            O("pageview", { url: t, referrer: e }, n)
          )
        },
        x = function (t, e, n, a) {
          return (
            void 0 === e && (e = "custom"),
            void 0 === n && (n = I),
            void 0 === a && (a = w),
            O("event", { event_type: e, event_value: t, url: n }, a)
          )
        },
        A = function () {
          v.querySelectorAll("[class*='umami--']").forEach(function (t) {
            t.className.split(" ").forEach(function (e) {
              if (/^umami--([a-z]+)--([\w]+[\w-]*)$/.test(e)) {
                var n = e.split("--"),
                  a = n[1],
                  i = n[2],
                  r = function () {
                    return x(i, a)
                  }
                q.push([t, a, r]), t.addEventListener(a, r, !0)
              }
            })
          })
        },
        H = function () {
          q.forEach(function (t) {
            var e = t[0],
              n = t[1],
              a = t[2]
            e && e.removeEventListener(n, a, !0)
          }),
            (q.length = 0)
        },
        R = function (t, e, n) {
          if (n) {
            H(), (L = I)
            var a = n.toString()
            ;(I = "http" === a.substring(0, 4) ? "/" + a.split("/").splice(3).join("/") : a) !==
              L && P(I, L),
              setTimeout(A, 300)
          }
        }
      if (!n.umami) {
        var _ = function (t) {
          return x(t)
        }
        ;(_.trackView = P),
          (_.trackEvent = x),
          (_.addEvents = A),
          (_.removeEvents = H),
          (n.umami = _)
      }
      S &&
        !T &&
        ((p.pushState = t(p, "pushState", R)),
        (p.replaceState = t(p, "replaceState", R)),
        P(I, L),
        A())
    }
  })(window)
})()
