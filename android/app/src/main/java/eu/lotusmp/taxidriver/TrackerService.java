package eu.lotusmp.taxidriver;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Услуга „на смяна“: работи на преден план (с известие), държи GPS-а включен
 * и изпраща местоположението към сървъра на LOTUS MP дори при изключен екран,
 * докато шофьорът не натисне „Край на смяната“ или не излезе от профила си.
 */
public class TrackerService extends Service implements LocationListener {

    public static final String PREFS = "lmp_tracker";
    public static final String ACTION_START = "eu.lotusmp.taxidriver.START";
    public static final String ACTION_FREE = "eu.lotusmp.taxidriver.FREE";
    public static final String ACTION_BUSY = "eu.lotusmp.taxidriver.BUSY";
    public static final String ACTION_STOP = "eu.lotusmp.taxidriver.STOP";

    private static final String CHANNEL = "shift";
    private static final int NOTIF_ID = 4711;
    private static final long TICK_MS = 5000;        // проверка на всеки 5 сек.
    private static final long HEARTBEAT_MS = 12000;  // сигнал поне на 12 сек., дори колата да стои
    private static final float MOVE_M = 30f;         // или при преместване над 30 м

    public static volatile boolean running = false;

    private LocationManager lm;
    private PowerManager.WakeLock wakeLock;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private ExecutorService net;
    private Location last;
    private Location lastSentLoc;
    private long lastSent = 0;
    private String lastSentStatus = "";
    private volatile boolean sending = false;

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            maybeSend(false);
            handler.postDelayed(this, TICK_MS);
        }
    };

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        net = Executors.newSingleThreadExecutor();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        SharedPreferences p = prefs(this);

        if (ACTION_FREE.equals(action)) p.edit().putString("status", "free").apply();
        if (ACTION_BUSY.equals(action)) p.edit().putString("status", "busy").apply();

        // Винаги първо известието – Android го изисква до 5 сек. след старта.
        if (!startInForeground()) return START_NOT_STICKY;

        if (ACTION_STOP.equals(action)) {
            endShift(true);
            return START_NOT_STICKY;
        }
        // Рестарт от системата (intent == null) продължава само ако смяната е активна.
        if (!p.getBoolean("shift", false) || p.getString("token", "").isEmpty()) {
            stopSelfClean();
            return START_NOT_STICKY;
        }
        if (!running) begin();
        else maybeSend(true);
        return START_STICKY;
    }

    private boolean hasLocPerm() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean startInForeground() {
        try {
            int type = Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION : 0;
            ServiceCompat.startForeground(this, NOTIF_ID, buildNotification(), type);
            return true;
        } catch (Exception e) {
            prefs(this).edit().putString("error", "permission").putBoolean("shift", false).apply();
            running = false;
            stopSelf();
            return false;
        }
    }

    @SuppressLint({"MissingPermission", "WakelockTimeout"})
    private void begin() {
        running = true;
        lastSent = 0;
        lastSentStatus = "";
        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LotusMP:shift");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire();
        }
        if (lm != null && hasLocPerm()) {
            try { lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 3000, 0, this, Looper.getMainLooper()); } catch (Exception ignored) { }
            try { lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 10000, 0, this, Looper.getMainLooper()); } catch (Exception ignored) { }
            try {
                Location g = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                if (g == null) g = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                if (g != null && System.currentTimeMillis() - g.getTime() < 120000) onLocationChanged(g);
            } catch (Exception ignored) { }
        }
        handler.removeCallbacks(tick);
        handler.post(tick);
    }

    @Override
    public void onLocationChanged(@NonNull Location loc) {
        // Ако имаме скорошен GPS, по-неточното мрежово местоположение не го заменя.
        if (last != null && LocationManager.NETWORK_PROVIDER.equals(loc.getProvider())
            && LocationManager.GPS_PROVIDER.equals(last.getProvider())
            && loc.getTime() - last.getTime() < 20000) {
            return;
        }
        last = loc;
        prefs(this).edit().putFloat("acc", loc.getAccuracy()).putLong("fix", System.currentTimeMillis()).apply();
        maybeSend(false);
    }

    @Override public void onProviderEnabled(@NonNull String provider) { }
    @Override public void onProviderDisabled(@NonNull String provider) { }
    @Override public void onStatusChanged(String provider, int status, Bundle extras) { }

    private void maybeSend(boolean force) {
        if (last == null || sending || !running) return;
        SharedPreferences p = prefs(this);
        final String status = p.getString("status", "free");
        long now = System.currentTimeMillis();
        float moved = lastSentLoc == null ? Float.MAX_VALUE : last.distanceTo(lastSentLoc);
        boolean changed = !status.equals(lastSentStatus);
        if (!force && !changed && now - lastSent < HEARTBEAT_MS && moved < MOVE_M) return;
        if (!force && !changed && now - lastSent < 4000) return;

        final Location loc = last;
        final String api = p.getString("api", "");
        final String token = p.getString("token", "");
        Integer heading = null;
        if (loc.hasBearing() && loc.hasSpeed() && loc.getSpeed() > 1f) {
            heading = Math.round(loc.getBearing()) % 360;
        } else if (lastSentLoc != null && moved > 15f && moved != Float.MAX_VALUE) {
            heading = (Math.round(lastSentLoc.bearingTo(loc)) + 360) % 360;
        }
        final Integer hd = heading;
        sending = true;
        net.execute(new Runnable() {
            @Override
            public void run() {
                int code;
                String body = "";
                try {
                    JSONObject o = new JSONObject();
                    o.put("lat", loc.getLatitude());
                    o.put("lng", loc.getLongitude());
                    o.put("status", status);
                    if (hd != null) o.put("heading", hd.intValue()); else o.put("heading", "");
                    o.put("acc", Math.round(loc.getAccuracy()));
                    HttpResult r = post(api + "ping", token, o.toString());
                    code = r.code;
                    body = r.body;
                } catch (Exception e) {
                    code = -1;
                }
                final int fc = code;
                final String fb = body;
                handler.post(new Runnable() {
                    @Override
                    public void run() {
                        onPingResult(fc, fb, loc, status);
                    }
                });
            }
        });
    }

    private void onPingResult(int code, String body, Location loc, String status) {
        sending = false;
        if (!running) return;
        SharedPreferences.Editor e = prefs(this).edit();
        if (code == 200) {
            lastSent = System.currentTimeMillis();
            lastSentLoc = loc;
            lastSentStatus = status;
            e.putLong("sent", lastSent).putString("error", "");
            try {
                JSONObject j = new JSONObject(body);
                if (j.optBoolean("out_of_area", false)) e.putString("error", "out_of_area");
                if (j.has("calls_today")) e.putInt("calls_today", j.optInt("calls_today"));
            } catch (Exception ignored) { }
            e.apply();
        } else if (code == 401) {
            e.putString("error", "auth").apply();
            endShift(false);
        } else if (code == 403) {
            String msg = "";
            try { msg = new JSONObject(body).optString("message", ""); } catch (Exception ignored) { }
            e.putString("error", "inactive").putString("error_msg", msg).apply();
            endShift(false);
        } else {
            e.putString("error", "net").apply();
        }
    }

    private void endShift(boolean sendOffline) {
        SharedPreferences p = prefs(this);
        final String api = p.getString("api", "");
        final String token = p.getString("token", "");
        p.edit().putBoolean("shift", false).apply();
        if (sendOffline && !token.isEmpty() && net != null && !net.isShutdown()) {
            net.execute(new Runnable() {
                @Override
                public void run() {
                    try { post(api + "offline", token, "{}"); } catch (Exception ignored) { }
                }
            });
        }
        stopSelfClean();
    }

    private void cleanup() {
        running = false;
        handler.removeCallbacks(tick);
        if (lm != null) {
            try { lm.removeUpdates(this); } catch (Exception ignored) { }
        }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
    }

    private void stopSelfClean() {
        cleanup();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        cleanup();
        if (net != null) net.shutdown();
        super.onDestroy();
    }

    /* ---------- Известие ---------- */

    private static String[] texts(String lang) {
        if ("tr".equals(lang)) return new String[]{"Vardiyada · Boş", "Vardiyada · Dolu", "Aracınız Kırcaali haritasında görünüyor", "Boş", "Dolu", "Bitir"};
        if ("en".equals(lang)) return new String[]{"On shift · Free", "On shift · Busy", "Your car is visible on the Kardzhali map", "Free", "Busy", "End"};
        return new String[]{"На смяна · Свободен", "На смяна · Зает", "Колата ви се вижда на картата на Кърджали", "Свободен", "Зает", "Край"};
    }

    private Notification buildNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Смяна / Vardiya", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Показва се, докато сте на смяна и колата ви е на картата");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        SharedPreferences p = prefs(this);
        boolean busy = "busy".equals(p.getString("status", "free"));
        String[] t = texts(p.getString("lang", "bg"));

        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent piOpen = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_taxi)
            .setContentTitle(busy ? t[1] : t[0])
            .setContentText(t[2])
            .setColor(busy ? 0xFFDC2626 : 0xFF16A34A)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(piOpen)
            .addAction(0, (busy ? "" : "● ") + t[3], svc(ACTION_FREE, 1))
            .addAction(0, (busy ? "● " : "") + t[4], svc(ACTION_BUSY, 2))
            .addAction(0, t[5], svc(ACTION_STOP, 3))
            .build();
    }

    private PendingIntent svc(String action, int req) {
        Intent i = new Intent(this, TrackerService.class).setAction(action);
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        if (Build.VERSION.SDK_INT >= 26) return PendingIntent.getForegroundService(this, req, i, fl);
        return PendingIntent.getService(this, req, i, fl);
    }

    /* ---------- HTTP ---------- */

    static class HttpResult {
        int code;
        String body;
    }

    static HttpResult post(String url, String token, String json) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(15000);
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        c.setRequestProperty("Accept", "application/json");
        c.setRequestProperty("User-Agent", "LotusMP-TaxiDriver-Android");
        if (token != null && !token.isEmpty()) c.setRequestProperty("X-LMP-Token", token);
        OutputStream os = c.getOutputStream();
        try { os.write(json.getBytes(StandardCharsets.UTF_8)); } finally { os.close(); }
        HttpResult r = new HttpResult();
        r.code = c.getResponseCode();
        InputStream is = r.code >= 400 ? c.getErrorStream() : c.getInputStream();
        StringBuilder sb = new StringBuilder();
        if (is != null) {
            BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            try {
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
            } finally {
                br.close();
            }
        }
        r.body = sb.toString();
        c.disconnect();
        return r;
    }
}
