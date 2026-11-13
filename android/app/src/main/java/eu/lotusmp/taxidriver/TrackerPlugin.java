package eu.lotusmp.taxidriver;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Връзка между интерфейса на приложението (JavaScript) и услугата за смяната. */
@CapacitorPlugin(
    name = "Tracker",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class TrackerPlugin extends Plugin {

    private boolean locationGranted() {
        return getPermissionState("location") == PermissionState.GRANTED;
    }

    private boolean ignoringBattery() {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    private JSObject state() {
        SharedPreferences p = TrackerService.prefs(getContext());
        JSObject r = new JSObject();
        r.put("running", TrackerService.running);
        r.put("shift", p.getBoolean("shift", false));
        r.put("status", p.getString("status", "free"));
        r.put("sent", p.getLong("sent", 0));
        r.put("fix", p.getLong("fix", 0));
        r.put("acc", (double) p.getFloat("acc", 0f));
        r.put("error", p.getString("error", ""));
        r.put("errorMsg", p.getString("error_msg", ""));
        r.put("callsToday", p.getInt("calls_today", -1));
        r.put("now", System.currentTimeMillis());
        r.put("battery", ignoringBattery());
        r.put("location", locationGranted());
        r.put("android", Build.VERSION.SDK_INT);
        return r;
    }

    /** Иска разрешенията: местоположение, после известия (Android 13+). */
    @PluginMethod
    public void prepare(PluginCall call) {
        if (!locationGranted()) {
            requestPermissionForAlias("location", call, "locationCallback");
            return;
        }
        askNotifications(call);
    }

    @PermissionCallback
    private void locationCallback(PluginCall call) {
        if (!locationGranted()) {
            JSObject r = state();
            r.put("ok", false);
            call.resolve(r);
            return;
        }
        askNotifications(call);
    }

    private void askNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationsCallback");
            return;
        }
        notificationsCallback(call);
    }

    @PermissionCallback
    private void notificationsCallback(PluginCall call) {
        JSObject r = state();
        r.put("ok", locationGranted());
        r.put("notifications", Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod
    public void start(PluginCall call) {
        String api = call.getString("api", "");
        String token = call.getString("token", "");
        String status = "busy".equals(call.getString("status", "free")) ? "busy" : "free";
        String lang = call.getString("lang", "bg");
        if (api == null || api.isEmpty() || token == null || token.isEmpty()) {
            call.reject("missing");
            return;
        }
        if (!locationGranted()) {
            call.reject("location");
            return;
        }
        Context c = getContext();
        TrackerService.prefs(c).edit()
            .putString("api", api)
            .putString("token", token)
            .putString("status", status)
            .putString("lang", lang)
            .putBoolean("shift", true)
            .putString("error", "")
            .putLong("sent", 0)
            .apply();
        ContextCompat.startForegroundService(c, new Intent(c, TrackerService.class).setAction(TrackerService.ACTION_START));
        call.resolve(state());
    }

    @PluginMethod
    public void setStatus(PluginCall call) {
        Context c = getContext();
        SharedPreferences.Editor e = TrackerService.prefs(c).edit();
        String st = call.getString("status");
        if (st != null) e.putString("status", "busy".equals(st) ? "busy" : "free");
        String lang = call.getString("lang");
        if (lang != null) e.putString("lang", lang);
        e.apply();
        String now = TrackerService.prefs(c).getString("status", "free");
        if (TrackerService.running) {
            ContextCompat.startForegroundService(c, new Intent(c, TrackerService.class)
                .setAction("busy".equals(now) ? TrackerService.ACTION_BUSY : TrackerService.ACTION_FREE));
        }
        call.resolve(state());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context c = getContext();
        if (TrackerService.running) {
            ContextCompat.startForegroundService(c, new Intent(c, TrackerService.class).setAction(TrackerService.ACTION_STOP));
        } else {
            TrackerService.prefs(c).edit().putBoolean("shift", false).apply();
        }
        call.resolve(state());
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(state());
    }

    /** Изход от профила: спира смяната и изтрива пазения токен. */
    @PluginMethod
    public void logout(PluginCall call) {
        Context c = getContext();
        if (TrackerService.running) {
            ContextCompat.startForegroundService(c, new Intent(c, TrackerService.class).setAction(TrackerService.ACTION_STOP));
        }
        TrackerService.prefs(c).edit().putBoolean("shift", false).remove("token").apply();
        call.resolve();
    }

    @PluginMethod
    public void requestBattery(PluginCall call) {
        Context c = getContext();
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            i.setData(Uri.parse("package:" + c.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(i);
        } catch (Exception e) {
            try {
                Intent i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(i);
            } catch (Exception ignored) { }
        }
        call.resolve();
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Context c = getContext();
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(i);
        } catch (Exception ignored) { }
        call.resolve();
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url", "");
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception ignored) { }
        call.resolve();
    }

    @PluginMethod
    public void appInfo(PluginCall call) {
        JSObject r = new JSObject();
        try {
            r.put("version", getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionName);
        } catch (Exception e) {
            r.put("version", "");
        }
        call.resolve(r);
    }
}
