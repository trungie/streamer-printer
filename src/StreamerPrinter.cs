using System;
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
		// Create a process to print the pdf
		Process printPdf = new Process();

		printPdf.StartInfo.FileName = (teotools_path + "bin\\pdftoprinter.exe");
		if (CPHInline.Debug) {
			printPdf.StartInfo.WindowStyle = ProcessWindowStyle.Maximized;
		} else {
			printPdf.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
		}
		// TODO : Escape the printer name

		string args =  pdfpath + " \"" + PrinterName + "\"";
		CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] Printing "+pdfpath+" to printer " + PrinterName);

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

		CPH.LogInfo("[TEOTOOLS:STREAMERPRINTER] PDF Print Result: "+output);

		if (CPHInline.Debug) {
			System.Diagnostics.Process.Start(pdfpath);

		}
		if (CPHInline.Debug != true) {
			// Delete the html file source
			File.Delete(pdfpath);

		}
	}

}
