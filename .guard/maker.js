const fs = require("fs");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { mdToPdf } = require("md-to-pdf");

async function make(homework) {
    log("=====");
    log(`Generating resources of ${homework}`);
    const cFiles = fs.readdirSync(path.join(__dirname, "../", homework)).filter((f) => f.endsWith(".c"));

    //#region Makefile
    const makefile = createMakefile(cFiles);
    fs.writeFileSync(path.join(__dirname, "../", homework, "Makefile"), makefile, "utf8");
    //#endregion

    //#region README.md
    if (!fs.existsSync(path.join(__dirname, "../", homework, "README.md")))
        fs.writeFileSync(path.join(__dirname, "../", homework, "README.md"), createREADME(cFiles), "utf8");
    //#endregion

    //#region MD -> PDF
    if (fs.existsSync(path.join(__dirname, "../", homework, "README.md")))
        await MDtoPDF(path.join(__dirname, "../", homework, "README.md"), path.join(__dirname, "../", homework, "README.pdf"));
    const mdFiles = fs.readdirSync(path.join(__dirname, "../", homework)).filter((f) => f.endsWith(".md"));
    for (const mdFile of mdFiles) {
        log(`Converting ${mdFile} to PDF`);
        await MDtoPDF(path.join(__dirname, "../", homework, mdFile), path.join(__dirname, "../", homework, mdFile.replace(".md", ".pdf")));
    }
    //#endregion

    const pdfFiles = fs.readdirSync(path.join(__dirname, "../", homework)).filter((f) => f.endsWith(".pdf"));

    //#region  ZIP
    if (process.platform === "win32") {
        log("Windows does not support zip command.");
    } else {
        const { stdout, stderr } = await exec(`cd ${homework} && zip ${homework}.zip README Makefile ${cFiles.join(" ")} ${pdfFiles.join(" ")}`);
        log(`STDOUT: \n${stdout}`);
        if (stderr) log(`STDERR: \n${stderr}`);
        if (fs.existsSync(path.join(__dirname, "../", homework, `${homework}.zip`))) {
            if (!fs.existsSync(path.join(__dirname, "../", "dist"))) fs.mkdirSync(path.join(__dirname, "../", "dist"));
            fs.renameSync(path.join(__dirname, "../", homework, `${homework}.zip`), path.join(__dirname, "../", "dist", `${homework}.zip`));
            log(`${homework}.zip is generated.`);
        }
    }
    //#endregion
}

function createMakefile(cFiles) {
    let makefile = "";
    makefile += "all: \n";
    makefile += cFiles.map((f) => `\tgcc ${f} -o ${f.split(".")[0]}`).join("\n");
    makefile += "\n";
    makefile += "clean: \n";
    makefile += cFiles.map((f) => `\trm ${f.split(".")[0]}`).join("\n");
    makefile += "\n";
    log("Generated Makefile:\n---\n" + makefile + "\n---\n");
    return makefile;
}

function createREADME(cFiles) {
    let readme =
        `# 程式設計一 Homework 1

    Author: 師大資工 114 林振可 (41047029S)
    
    建議使用 Linux 系統執行。
    
    ## 1. 編譯程式
    
    請於此目錄執行：make`
            .split("\n")
            .map((line) => line.trim())
            .join("\n") + "\n";
    if (cFiles.length) {
        readme += "\n";
        readme += "## 2. 執行程式\n\n";
        readme += "分別執行 " + cFiles.map((f) => `./${f.split(".")[0]}`).join(" | ");
        readme += "\n";
    }

    log("Generated README.md:\n---\n" + readme + "\n---\n");
    return readme;
}

async function MDtoPDF(filepath, distpath) {
    try {
        const pdf = await mdToPdf(
            { path: filepath },
            {
                highlight_style: "nord",
                css: `body { font-family: "Noto Sans TC", sans-serif !important; } pre > code { background: #2E3440 !important; font-family: "MesloLGS NF", "Cascadia Code", "Ubuntu Mono", monospace !important; }`,
                pdf_options: {
                    format: "A4",
                    orientation: "portrait",
                    border: "1cm",
                    border_color: "#2E3440",
                    border_style: "solid",
                    margin: "1cm",
                    header: {
                        height: "1cm",
                        contents: "<span style='color: #2E3440; font-size: 10px;'>Homework 1</span>",
                    },
                    footer: {
                        height: "1cm",
                        contents: "<span style='color: #2E3440; font-size: 10px;'>Homework 1</span>",
                    },
                    printBackground: true,
                },
            }
        );
        if (pdf) fs.writeFileSync(distpath, pdf.content);
        else throw new Error("PDF Conversion Failed.");
    } catch (err) {
        log(err);
    }
}

function log(...msg) {
    console.log("[Maker]", ...msg);
}

module.exports = make;