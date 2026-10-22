using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;

internal static class ButlerLauncher {
    static int Main(string[] args) {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string node = Path.Combine(root, "runtime", "node.exe");
        string launch = Path.Combine(root, "Launch.cjs");
        if (!File.Exists(node) || !File.Exists(launch)) {
            Console.Error.WriteLine("Extract the entire Butler package before starting Butler.exe.");
            return 1;
        }
        if (Array.IndexOf(args, "--check") >= 0) {
            Console.WriteLine("Butler portable launcher ready. Bundled runtime found beside this executable.");
            return 0;
        }
        int port;
        if (!Int32.TryParse(Environment.GetEnvironmentVariable("PORT") ?? "3000", out port) || port < 1024 || port > 65535) {
            Console.Error.WriteLine("PORT must be between 1024 and 65535.");
            return 1;
        }
        try {
            var start = new ProcessStartInfo(node, "\"" + launch + "\"") { WorkingDirectory = root, UseShellExecute = false };
            using (var child = Process.Start(start)) {
                string url = "http://127.0.0.1:" + port;
                bool noBrowser = Environment.GetEnvironmentVariable("BUTLER_NO_BROWSER") == "1" || Array.IndexOf(args, "--no-browser") >= 0;
                if (!noBrowser) {
                    bool ready = false;
                    for (int i = 0; i < 100 && !child.HasExited; i++) {
                        try {
                            var request = (HttpWebRequest)WebRequest.Create(url);
                            request.Proxy = null;
                            request.Timeout = 500;
                            using (var response = (HttpWebResponse)request.GetResponse()) { ready = response.StatusCode == HttpStatusCode.OK; }
                            if (ready) break;
                        } catch (WebException) { }
                        Thread.Sleep(250);
                    }
                    if (ready && !child.HasExited) {
                        try { Process.Start(new ProcessStartInfo("microsoft-edge:" + url) { UseShellExecute = true }); }
                        catch { Console.WriteLine("Open " + url + " in Microsoft Edge. The automatic browser launch was unavailable."); }
                    }
                }
                child.WaitForExit();
                return child.ExitCode;
            }
        } catch (Exception) {
            Console.Error.WriteLine("Could not start Butler. Keep the package together in a writable local folder.");
            return 1;
        }
    }
}
