try {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var f = fso.OpenTextFile("app.js", 1);
    var code = f.ReadAll();
    f.Close();
    // Use eval to check syntax
    eval("function wrapper() { " + code + "}");
    WScript.Echo("No syntax errors");
} catch(e) {
    WScript.Echo("Syntax Error: " + e.message + " on line " + e.line);
}
