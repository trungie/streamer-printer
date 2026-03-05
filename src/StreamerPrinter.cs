using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using System.IO;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class CPHInline
{
	static string PrinterName;
	static string teotools_path;
	static bool Debug;
	static int MaxPrintRetries = 3;
	static int PrintRetryDelayMs = 5000;

    class IniFile   // revision 11
    {
        string Path;
        string EXE = Assembly.GetExecutingAssembly().GetName().Name;

        [DllImport("kernel32", CharSet = CharSet.Unicode)]
        static extern long WritePrivateProfileString(string Section, string Key, string Value, string FilePath);

        [DllImport("kernel32", CharSet = CharSet.Unicode)]
        static extern int GetPrivateProfileString(string Section, string Key, string Default, StringBuilder RetVal, int Size, string FilePath);

        public IniFile(string IniPath = null)
        {
            Path = new FileInfo(IniPath ?? EXE + ".ini").FullName;
        }

        public string Read(string Key, string Section = null)
        {
            var RetVal = new StringBuilder(255);
            GetPrivateProfileString(Section ?? EXE, Key, "", RetVal, 255, Path);
            return RetVal.ToString();
        }

        public void Write(string Key, string Value, string Section = null)
        {
            WritePrivateProfileString(Section ?? EXE, Key, Value, Path);
        }

        public void DeleteKey(string Key, string Section = null)
        {
            Write(Key, null, Section ?? EXE);
        }

        public void DeleteSection(string Section = null)
        {
            Write(null, null, Section ?? EXE);
        }

        public bool KeyExists(string Key, string Section = null)
        {
            return Read(Key, Section).Length > 0;
        }
    }
	public bool Execute()
	{
		string path = Directory.GetCurrentDirectory();
		string teotools_path = path + "\\teotools\\streamerprinter\\";
		CPHInline.teotools_path = teotools_path;
		// Path.Combine(rootFolder, authorsFile)
		CPHInline.Debug = (bool)args["Debug"];

		// Save source in arguments as a string
		//args["source"] = "" + args["__source"];
		/*PropertyInfo source_property = args.GetType().GetProperty("__source");
		if (source_property == null) {
			args["source"] = "StreamElementsTip";
		} else {
			args["source"] = "" + args["__source"];
		}*/
		CPH.SetGlobalVar("args", args);
		if (args.ContainsKey("__source")) {
			args["source"] = "" + args["__source"];
		} else {
			CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] No source property, will not be able to render a template");
			return false;
}
		// Serialize the JSON for embedding in the HTML file
		string json = JsonConvert.SerializeObject(args);

		json = "window.data = " + json;
		json += "\nwindow.sourceProgram = 'streamerbot';\n";

		// Inject Claude API key if available
		string claudeKeyPath = teotools_path + ".claude-api-key";
		if (File.Exists(claudeKeyPath))
		{
			string claudeKey = File.ReadAllText(claudeKeyPath).Trim();
			json += "window.data.claudeApiKey = " + JsonConvert.SerializeObject(claudeKey) + ";\n";
		}

		// Inject April Fools prompt template if available
		string promptPath = teotools_path + "addons\\april-fools-prompt.txt";
		if (File.Exists(promptPath))
		{
			string prompt = File.ReadAllText(promptPath);
			json += "window.data.aprilFoolsPrompt = " + JsonConvert.SerializeObject(prompt) + ";\n";
		}

		// Log the JSON
		CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] Object sent to printer: " + json);

		// Combine the component files into the output file
		string head = File.ReadAllText(teotools_path + "templates\\head.html");
		string templates = File.ReadAllText(teotools_path + "templates\\templates.html");
		string addons = File.ReadAllText(teotools_path + "addons\\addons.html");
		string footer = File.ReadAllText(teotools_path + "templates\\foot.html");
		string output = head + "</div><script>" + json + "</script>" + addons + "\n" + templates + "<div>" + footer;

		string outfile = teotools_path + "temp\\" + args["source"] + "__" + DateTime.Now.ToString("yyyyMMddHHmmssfff") + ".html";
		File.WriteAllText(outfile, output);
		CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] Created template file at "+outfile);
		string PrinterName = (string)args["PrinterName"];
		string PaperSize = (string)args["PaperSize"];

		// Print the html file to pdf
		PrintToPdf(teotools_path, outfile, PrinterName, PaperSize);

		// your main code goes here
		return true;
	}

	void PrintToPdf(string teotools_path, string outfile, string PrinterName, string PaperSize)
	{
		// Read the printer config
		/*
		var PrinterConfig = new IniFile(teotools_path + "printer_config.ini");
		string PrinterName = PrinterConfig.Read("name","printer");
		CPHInline.PrinterName = PrinterName;

		string PaperSize = PrinterConfig.Read("papersize","printer");
		CPH.LogInfo(PrinterName);*/
		/*
		string PrinterName = args["PrinterName"];
		string PaperSize = args["PaperSize"];
		*/

		// Create a process to print the pdf
		Process printPdf = new Process();

		printPdf.StartInfo.FileName = (teotools_path + "bin\\wkhtmltopdf.exe");
		if (CPHInline.Debug) {
			printPdf.StartInfo.WindowStyle = ProcessWindowStyle.Maximized;
		} else {
			printPdf.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
		}
		string pdfpath = "\"" + teotools_path + "temp\\" + DateTime.Now.ToString("yyyyMMddHHmmssfff") + ".pdf" + "\"";
		string args = "-s " + PaperSize;
		args += " --load-error-handling ignore --no-background --debug-javascript --enable-javascript --enable-local-file-access --javascript-delay 800 --header-spacing -200 --margin-top 0 --footer-spacing 50";
		args += " \"" + outfile + "\" " + pdfpath;
		CPH.LogInfo(args);
		CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] Creating PDF file at "+pdfpath);

		// Run the process to convert html to pdf
		printPdf.StartInfo.Arguments = args;
		printPdf.StartInfo.RedirectStandardOutput = true;
		printPdf.StartInfo.RedirectStandardError = true;
		printPdf.StartInfo.UseShellExecute = false;
		printPdf.StartInfo.CreateNoWindow = true;
		printPdf.Start();

		string output = "STDOUT:" + printPdf.StandardOutput.ReadToEnd() + "\n";
		output += "STDERROR:" + printPdf.StandardError.ReadToEnd();
		printPdf.WaitForExit(5000);
		CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] PDF Creation Result: "+output);

		if (CPHInline.Debug) {
			System.Diagnostics.Process.Start(pdfpath);

		}
		if (CPHInline.Debug != true) {
			// Delete the html file source
			File.Delete(outfile);

			// Print the pdf printer to the receipt printer
			PrintPdf(teotools_path, pdfpath, PrinterName);
		}
	}

	void PrintPdf(string teotools_path, string pdfpath, string PrinterName)
	{
		// Move PDF to print history folder for retry support
		string historyDir = teotools_path + "print_history\\";
		if (!Directory.Exists(historyDir)) {
			Directory.CreateDirectory(historyDir);
		}

		string pdfFileName = System.IO.Path.GetFileName(pdfpath.Trim('"'));
		string historyPdfPath = historyDir + pdfFileName;

		// Copy the PDF to the history folder (keep original for printing)
		string cleanPdfPath = pdfpath.Trim('"');
		if (File.Exists(cleanPdfPath)) {
			File.Copy(cleanPdfPath, historyPdfPath, true);
		}

		// Save print job metadata
		string jobId = System.IO.Path.GetFileNameWithoutExtension(pdfFileName);
		SavePrintJob(teotools_path, jobId, historyPdfPath, PrinterName);

		// Attempt to print with retries
		bool printed = AttemptPrint(teotools_path, pdfpath, PrinterName, jobId);

		if (CPHInline.Debug) {
			System.Diagnostics.Process.Start(pdfpath);
		}
		if (CPHInline.Debug != true) {
			// Delete the original temp PDF (history copy is preserved)
			if (File.Exists(cleanPdfPath)) {
				File.Delete(cleanPdfPath);
			}
		}
	}

	bool AttemptPrint(string teotools_path, string pdfpath, string PrinterName, string jobId)
	{
		for (int attempt = 1; attempt <= CPHInline.MaxPrintRetries; attempt++)
		{
			CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] Print attempt " + attempt + " of " + CPHInline.MaxPrintRetries + " for job " + jobId);

			// Create a process to print the pdf
			Process printPdf = new Process();

			printPdf.StartInfo.FileName = (teotools_path + "bin\\pdftoprinter.exe");
			if (CPHInline.Debug) {
				printPdf.StartInfo.WindowStyle = ProcessWindowStyle.Maximized;
			} else {
				printPdf.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
			}

			string args = pdfpath + " \"" + PrinterName + "\"";
			CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] Printing " + pdfpath + " to printer " + PrinterName);

			printPdf.StartInfo.Arguments = args;
			printPdf.StartInfo.RedirectStandardOutput = true;
			printPdf.StartInfo.RedirectStandardError = true;
			printPdf.StartInfo.UseShellExecute = false;
			printPdf.StartInfo.CreateNoWindow = true;
			printPdf.Start();

			string output = "STDOUT:" + printPdf.StandardOutput.ReadToEnd() + "\n";
			output += "STDERROR:" + printPdf.StandardError.ReadToEnd();
			printPdf.WaitForExit(5000);

			CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] PDF Print Result (attempt " + attempt + "): " + output);

			// Check if print succeeded (exit code 0 means success)
			if (printPdf.ExitCode == 0)
			{
				CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] Print succeeded on attempt " + attempt);
				UpdatePrintJobStatus(teotools_path, jobId, "printed");
				return true;
			}

			CPH.LogWarn("[TEOTOOLS:STREAMERPRINTER] Print failed on attempt " + attempt + " with exit code " + printPdf.ExitCode);

			if (attempt < CPHInline.MaxPrintRetries)
			{
				CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] Waiting " + CPHInline.PrintRetryDelayMs + "ms before retry...");
				Thread.Sleep(CPHInline.PrintRetryDelayMs);
			}
		}

		CPH.LogWarn("[TEOTOOLS:STREAMERPRINTER] All " + CPHInline.MaxPrintRetries + " print attempts failed for job " + jobId + ". PDF saved in print_history folder for manual retry.");
		UpdatePrintJobStatus(teotools_path, jobId, "failed");
		return false;
	}

	class PrintJob
	{
		public string Id { get; set; }
		public string PdfPath { get; set; }
		public string PrinterName { get; set; }
		public string Status { get; set; }
		public string CreatedAt { get; set; }
		public string Source { get; set; }
	}

	void SavePrintJob(string teotools_path, string jobId, string pdfPath, string printerName)
	{
		string historyFile = teotools_path + "print_history\\print_jobs.json";
		List<PrintJob> jobs = LoadPrintJobs(teotools_path);

		string source = "unknown";
		var globalArgs = CPH.GetGlobalVar<Dictionary<string, object>>("args", true);
		if (globalArgs != null && globalArgs.ContainsKey("source"))
		{
			source = "" + globalArgs["source"];
		}

		jobs.Add(new PrintJob
		{
			Id = jobId,
			PdfPath = pdfPath,
			PrinterName = printerName,
			Status = "pending",
			CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
			Source = source
		});

		// Keep only the last 50 jobs
		if (jobs.Count > 50) {
			// Clean up old PDF files beyond the limit
			var oldJobs = jobs.Take(jobs.Count - 50).ToList();
			foreach (var oldJob in oldJobs)
			{
				if (File.Exists(oldJob.PdfPath)) {
					File.Delete(oldJob.PdfPath);
				}
			}
			jobs = jobs.Skip(jobs.Count - 50).ToList();
		}

		File.WriteAllText(historyFile, JsonConvert.SerializeObject(jobs, Formatting.Indented));
	}

	List<PrintJob> LoadPrintJobs(string teotools_path)
	{
		string historyFile = teotools_path + "print_history\\print_jobs.json";
		if (File.Exists(historyFile))
		{
			string json = File.ReadAllText(historyFile);
			return JsonConvert.DeserializeObject<List<PrintJob>>(json) ?? new List<PrintJob>();
		}
		return new List<PrintJob>();
	}

	void UpdatePrintJobStatus(string teotools_path, string jobId, string status)
	{
		List<PrintJob> jobs = LoadPrintJobs(teotools_path);
		var job = jobs.FindLast(j => j.Id == jobId);
		if (job != null)
		{
			job.Status = status;
			string historyFile = teotools_path + "print_history\\print_jobs.json";
			File.WriteAllText(historyFile, JsonConvert.SerializeObject(jobs, Formatting.Indented));
		}
	}

	// Retry the last failed print job
	public bool RetryLastPrint()
	{
		string path = Directory.GetCurrentDirectory();
		string teotools_path = path + "\\teotools\\streamerprinter\\";

		List<PrintJob> jobs = LoadPrintJobs(teotools_path);
		var lastFailed = jobs.FindLast(j => j.Status == "failed");

		if (lastFailed == null)
		{
			CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] No failed print jobs found to retry.");
			return false;
		}

		return RetryPrintJob(teotools_path, lastFailed);
	}

	// Retry a specific print job by index (0 = most recent, 1 = second most recent, etc.)
	public bool RetryPrintByIndex()
	{
		string path = Directory.GetCurrentDirectory();
		string teotools_path = path + "\\teotools\\streamerprinter\\";
		int index = args.ContainsKey("retryIndex") ? int.Parse("" + args["retryIndex"]) : 0;

		List<PrintJob> jobs = LoadPrintJobs(teotools_path);
		// Get all jobs in reverse order (most recent first)
		var recentJobs = jobs.AsEnumerable().Reverse().ToList();

		if (index < 0 || index >= recentJobs.Count)
		{
			CPH.LogWarn("[TEOTOOLS:STREAMERPRINTER] Invalid retry index: " + index + ". Total jobs: " + recentJobs.Count);
			return false;
		}

		var job = recentJobs[index];
		return RetryPrintJob(teotools_path, job);
	}

	bool RetryPrintJob(string teotools_path, PrintJob job)
	{
		if (!File.Exists(job.PdfPath))
		{
			CPH.LogWarn("[TEOTOOLS:STREAMERPRINTER] PDF file no longer exists: " + job.PdfPath);
			UpdatePrintJobStatus(teotools_path, job.Id, "missing");
			return false;
		}

		CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] Retrying print job " + job.Id + " (source: " + job.Source + ", created: " + job.CreatedAt + ")");

		string pdfpath = "\"" + job.PdfPath + "\"";
		return AttemptPrint(teotools_path, pdfpath, job.PrinterName, job.Id);
	}

}
