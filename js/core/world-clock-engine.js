/**
 * World Clock engine — IANA zones + Intl.DateTimeFormat.
 * One coordinated timer. No hardcoded UTC offsets.
 */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'aegis_world_clocks';
    var DEFAULTS = [
        { id: 'philadelphia', city: 'Philadelphia', country: 'United States', tz: 'America/New_York' },
        { id: 'london', city: 'London', country: 'United Kingdom', tz: 'Europe/London' },
        { id: 'paris', city: 'Paris', country: 'France', tz: 'Europe/Paris' },
        { id: 'dubai', city: 'Dubai', country: 'United Arab Emirates', tz: 'Asia/Dubai' },
        { id: 'new-delhi', city: 'New Delhi', country: 'India', tz: 'Asia/Kolkata' },
        { id: 'chennai', city: 'Chennai', country: 'India', tz: 'Asia/Kolkata' },
        { id: 'singapore', city: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore' },
        { id: 'tokyo', city: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
        { id: 'seoul', city: 'Seoul', country: 'South Korea', tz: 'Asia/Seoul' },
        { id: 'sydney', city: 'Sydney', country: 'Australia', tz: 'Australia/Sydney' }
    ];

    var CITY_CATALOG = DEFAULTS.concat([
        { id: 'new-york', city: 'New York', country: 'United States', tz: 'America/New_York' },
        { id: 'los-angeles', city: 'Los Angeles', country: 'United States', tz: 'America/Los_Angeles' },
        { id: 'chicago', city: 'Chicago', country: 'United States', tz: 'America/Chicago' },
        { id: 'toronto', city: 'Toronto', country: 'Canada', tz: 'America/Toronto' },
        { id: 'mexico-city', city: 'Mexico City', country: 'Mexico', tz: 'America/Mexico_City' },
        { id: 'sao-paulo', city: 'São Paulo', country: 'Brazil', tz: 'America/Sao_Paulo' },
        { id: 'buenos-aires', city: 'Buenos Aires', country: 'Argentina', tz: 'America/Argentina/Buenos_Aires' },
        { id: 'reykjavik', city: 'Reykjavík', country: 'Iceland', tz: 'Atlantic/Reykjavik' },
        { id: 'dublin', city: 'Dublin', country: 'Ireland', tz: 'Europe/Dublin' },
        { id: 'berlin', city: 'Berlin', country: 'Germany', tz: 'Europe/Berlin' },
        { id: 'amsterdam', city: 'Amsterdam', country: 'Netherlands', tz: 'Europe/Amsterdam' },
        { id: 'madrid', city: 'Madrid', country: 'Spain', tz: 'Europe/Madrid' },
        { id: 'rome', city: 'Rome', country: 'Italy', tz: 'Europe/Rome' },
        { id: 'stockholm', city: 'Stockholm', country: 'Sweden', tz: 'Europe/Stockholm' },
        { id: 'moscow', city: 'Moscow', country: 'Russia', tz: 'Europe/Moscow' },
        { id: 'istanbul', city: 'Istanbul', country: 'Türkiye', tz: 'Europe/Istanbul' },
        { id: 'cairo', city: 'Cairo', country: 'Egypt', tz: 'Africa/Cairo' },
        { id: 'nairobi', city: 'Nairobi', country: 'Kenya', tz: 'Africa/Nairobi' },
        { id: 'johannesburg', city: 'Johannesburg', country: 'South Africa', tz: 'Africa/Johannesburg' },
        { id: 'lagos', city: 'Lagos', country: 'Nigeria', tz: 'Africa/Lagos' },
        { id: 'jerusalem', city: 'Jerusalem', country: 'Israel', tz: 'Asia/Jerusalem' },
        { id: 'riyadh', city: 'Riyadh', country: 'Saudi Arabia', tz: 'Asia/Riyadh' },
        { id: 'tehran', city: 'Tehran', country: 'Iran', tz: 'Asia/Tehran' },
        { id: 'karachi', city: 'Karachi', country: 'Pakistan', tz: 'Asia/Karachi' },
        { id: 'mumbai', city: 'Mumbai', country: 'India', tz: 'Asia/Kolkata' },
        { id: 'kolkata', city: 'Kolkata', country: 'India', tz: 'Asia/Kolkata' },
        { id: 'dhaka', city: 'Dhaka', country: 'Bangladesh', tz: 'Asia/Dhaka' },
        { id: 'bangkok', city: 'Bangkok', country: 'Thailand', tz: 'Asia/Bangkok' },
        { id: 'jakarta', city: 'Jakarta', country: 'Indonesia', tz: 'Asia/Jakarta' },
        { id: 'manila', city: 'Manila', country: 'Philippines', tz: 'Asia/Manila' },
        { id: 'hong-kong', city: 'Hong Kong', country: 'Hong Kong', tz: 'Asia/Hong_Kong' },
        { id: 'shanghai', city: 'Shanghai', country: 'China', tz: 'Asia/Shanghai' },
        { id: 'taipei', city: 'Taipei', country: 'Taiwan', tz: 'Asia/Taipei' },
        { id: 'auckland', city: 'Auckland', country: 'New Zealand', tz: 'Pacific/Auckland' },
        { id: 'honolulu', city: 'Honolulu', country: 'United States', tz: 'Pacific/Honolulu' }
    ]);

    var listeners = [];
    var timer = null;
    var showSeconds = false;

    function safeParse(raw, fallback) {
        try {
            var value = JSON.parse(raw);
            return value == null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function loadClocks() {
        var stored = null;
        try { stored = safeParse(localStorage.getItem(STORAGE_KEY), null); } catch (e) { stored = null; }
        if (!stored || !Array.isArray(stored.clocks) || !stored.clocks.length) {
            return DEFAULTS.map(cloneClock);
        }
        return stored.clocks.map(normalizeClock).filter(Boolean);
    }

    function saveClocks(clocks) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ clocks: clocks, updatedAt: Date.now() }));
        } catch (e) { /* quota */ }
    }

    function cloneClock(item) {
        return { id: item.id, city: item.city, country: item.country, tz: item.tz };
    }

    function timezoneSupported(tz) {
        try {
            Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
            return true;
        } catch (e) {
            return false;
        }
    }

    function normalizeClock(item) {
        if (!item || typeof item !== 'object') return null;
        var tz = String(item.tz || '').trim();
        if (!tz || !timezoneSupported(tz)) return null;
        return {
            id: String(item.id || tz + '-' + (item.city || 'city')).slice(0, 80),
            city: String(item.city || tz.split('/').pop().replace(/_/g, ' ')).slice(0, 60),
            country: String(item.country || regionFromTz(tz)).slice(0, 60),
            tz: tz
        };
    }

    function regionFromTz(tz) {
        var part = String(tz).split('/')[0] || '';
        return part.replace(/_/g, ' ') || 'Region';
    }

    function partsFor(tz, now, withSeconds) {
        var options = {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        };
        if (withSeconds) options.second = '2-digit';
        var fmt = new Intl.DateTimeFormat('en-US', options);
        var bag = {};
        fmt.formatToParts(now).forEach(function (p) { bag[p.type] = p.value; });
        var hour = parseInt(bag.hour, 10);
        if (bag.hour === '24') hour = 0;
        var utcFmt = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'shortOffset',
            hour: '2-digit'
        });
        var offset = '';
        utcFmt.formatToParts(now).forEach(function (p) {
            if (p.type === 'timeZoneName') offset = p.value;
        });
        return {
            hour: hour,
            minute: parseInt(bag.minute, 10) || 0,
            second: withSeconds ? (parseInt(bag.second, 10) || 0) : 0,
            time: withSeconds
                ? (bag.hour + ':' + bag.minute + ':' + bag.second)
                : (bag.hour + ':' + bag.minute),
            date: (bag.weekday || '') + ', ' + (bag.month || '') + ' ' + (bag.day || ''),
            year: bag.year,
            offset: offset || '',
            isDay: hour >= 6 && hour < 19
        };
    }

    function snapshot(clocks, now, withSeconds) {
        return clocks.map(function (clock) {
            return Object.assign({}, clock, partsFor(clock.tz, now, withSeconds));
        });
    }

    function notify() {
        var clocks = loadClocks();
        var now = new Date();
        var rows = snapshot(clocks, now, showSeconds);
        listeners.forEach(function (fn) {
            try { fn(rows, now); } catch (e) { /* isolate */ }
        });
    }

    function nextDelay(withSeconds) {
        var ms = Date.now();
        if (withSeconds) return 1000 - (ms % 1000);
        return 60000 - (ms % 60000);
    }

    function schedule() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
            notify();
            schedule();
        }, nextDelay(showSeconds));
    }

    function setSecondsVisible(on) {
        showSeconds = !!on;
        schedule();
        notify();
    }

    function subscribe(fn) {
        if (typeof fn !== 'function') return function () {};
        listeners.push(fn);
        if (listeners.length === 1) {
            notify();
            schedule();
        } else {
            fn(snapshot(loadClocks(), new Date(), showSeconds), new Date());
        }
        return function () {
            listeners = listeners.filter(function (item) { return item !== fn; });
            if (!listeners.length && timer) {
                clearTimeout(timer);
                timer = null;
            }
        };
    }

    function searchCatalog(query) {
        var q = String(query || '').trim().toLowerCase();
        var extra = [];
        if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
            try {
                extra = Intl.supportedValuesOf('timeZone').map(function (tz) {
                    return {
                        id: tz,
                        city: tz.split('/').pop().replace(/_/g, ' '),
                        country: regionFromTz(tz),
                        tz: tz
                    };
                });
            } catch (e) { extra = []; }
        }
        var all = CITY_CATALOG.concat(extra);
        var seen = {};
        var out = [];
        all.forEach(function (item) {
            var key = item.tz + '|' + item.city;
            if (seen[key]) return;
            seen[key] = true;
            if (!q || item.city.toLowerCase().indexOf(q) >= 0 || item.country.toLowerCase().indexOf(q) >= 0 || item.tz.toLowerCase().indexOf(q) >= 0) {
                out.push(item);
            }
        });
        return out.slice(0, 80);
    }

    global.AegisWorldClock = {
        defaults: DEFAULTS,
        catalog: CITY_CATALOG,
        load: loadClocks,
        save: saveClocks,
        restoreDefaults: function () {
            var clocks = DEFAULTS.map(cloneClock);
            saveClocks(clocks);
            notify();
            return clocks;
        },
        add: function (item) {
            var clock = normalizeClock(item);
            if (!clock) return loadClocks();
            var clocks = loadClocks();
            if (clocks.some(function (c) { return c.tz === clock.tz && c.city === clock.city; })) return clocks;
            clocks.push(clock);
            saveClocks(clocks);
            notify();
            return clocks;
        },
        remove: function (id) {
            var clocks = loadClocks().filter(function (c) { return c.id !== id; });
            if (!clocks.length) clocks = DEFAULTS.map(cloneClock);
            saveClocks(clocks);
            notify();
            return clocks;
        },
        move: function (id, dir) {
            var clocks = loadClocks();
            var i = clocks.findIndex(function (c) { return c.id === id; });
            if (i < 0) return clocks;
            var j = i + dir;
            if (j < 0 || j >= clocks.length) return clocks;
            var tmp = clocks[i];
            clocks[i] = clocks[j];
            clocks[j] = tmp;
            saveClocks(clocks);
            notify();
            return clocks;
        },
        search: searchCatalog,
        subscribe: subscribe,
        setSecondsVisible: setSecondsVisible,
        snapshot: function (withSeconds) {
            return snapshot(loadClocks(), new Date(), !!withSeconds);
        },
        partsFor: partsFor,
        timezoneSupported: timezoneSupported
    };
})(typeof window !== 'undefined' ? window : globalThis);
