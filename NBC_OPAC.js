// change here! if column order or sheet name are modified in the sheet
const sheetname = "Sheet1";
const select = [
    "B", // 0 著者・編者
    "C", // 1 読み
    "D", // 2 シリーズ名
    "E", // 3 巻号
    "F", // 4 タイトル
    "H", // 5 出版者
    "J", // 6 出版年
    "K", // 7 分類記号
    "M", // 8 配架場所
    "L", // 9 NDL書誌ID
    "I", // 10 出版者備考
    "G" // 11 タイトル備考
];
const yomiIndex = 1;
const authorIndices = [0, yomiIndex];
const title2Index = 11;
const titleIndices = [2, 4, title2Index];
const publisher2Index = 10;
const publisherIndices = [5, publisher2Index];
const publishyearIndex = 6;
const NDLBibIDIndex = 9;
//
var querySelect = [];
var hiddenIndex = -1;
select.forEach(function (e, i) {
    if (i === NDLBibIDIndex) {
        hiddenIndex = querySelect.length;
    }
    if (i !== yomiIndex && i !== title2Index && i !== publisher2Index) {
        querySelect.push(e);
    }
});

const ro = new ResizeObserver(function () {
    setResultsSize();
});
new Promise(function () {
    setTimeout(function () {
        var target;
        do {
            target = document.getElementById("wrapper");
        } while (!target);
        ro.observe(target);
    }, 1000);
});

function setResultsSize() {
    "use strict";
    var rectangleWithOutMargin = document.getElementById("wrapper");
    var resultWrapper = document.getElementById("result-wrapper");
    var rect = resultWrapper.getBoundingClientRect();
    var results = document.getElementById("results");
    if (rect.left === 0) { // portrait
        results.style.height = (rectangleWithOutMargin.getBoundingClientRect().height - rect.top) + "px";
        results.style.width = rectangleWithOutMargin.getBoundingClientRect().width + "px";
    } else { // landscape
        results.style.height = rectangleWithOutMargin.getBoundingClientRect().height + "px";
        results.style.width = (rectangleWithOutMargin.getBoundingClientRect().width - 280) + "px";
    }
}

function toKatakana(s) {
    "use strict";
    return s.replace(/[ぁ-ゖ]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) + 0x60);
    });
}

function sendQuery(event) {
    "use strict";
    var obj = {};
    var publishyears = {};
    var q = "select ";
    var concat = false;
    var op;
    var op2;
    ["keyword", "title", "author", "publisher"].forEach(function (s) {
        obj[s + "s"] = document.querySelector("input[name=\"" + s + "\"]").value.replace(/[\s\u3000"]+/g, " ").replace(/^\s*|\s*$/g, "").split(" ");
        obj[s + "Operator"] = (
            document.querySelector("input[name=\"" + s + "Or\"]").checked
            ? "or"
            : "and"
        );
    });
    ["from", "until"].forEach(function (s) {
        var sel = document.querySelector("input[name=\"year" + s + "\"]");
        var year = parseInt(sel.value, 10);
        if (Number.isNaN(year)) {
            sel.value = "";
        } else {
            publishyears[s] = year;
        }
    });
    if (obj.keywords[0] || obj.titles[0] || obj.authors[0] || obj.publishers[0] || publishyears.from || publishyears.until) {
        op = "";
        querySelect.forEach(function (s) {
            q += op + s;
            if (!op) {
                op = ",";
            }
        });
        q += " where";
        if (obj.keywords[0]) {
            if (concat) {
                q += "and";
            }
            concat = true;
            op = "";
            q += "(";
            obj.keywords.forEach(function (keyword) {
                q += op + "(";
                op2 = "";
                titleIndices.forEach(function (titleIndex) {
                    q += op2 + select[titleIndex] + " contains\"" + keyword + "\"";
                    if (!op2) {
                        op2 = "or ";
                    }
                });
                authorIndices.forEach(function (authorIndex) {
                    q += op2 + select[authorIndex] + " contains\"" + keyword + "\"";
                });
                publisherIndices.forEach(function (publisherIndex) {
                    q += op2 + select[publisherIndex] + " contains\"" + keyword + "\"";
                });
                q += ")";
                if (!op) {
                    op = obj.keywordOperator;
                }
            });
            q += ")";
        }
        if (obj.titles[0]) {
            if (concat) {
                q += "and";
            }
            concat = true;
            op = "";
            q += "(";
            obj.titles.forEach(function (title) {
                q += op + "(";
                op2 = "";
                titleIndices.forEach(function (titleIndex) {
                    q += op2 + select[titleIndex] + " contains\"" + title + "\"";
                    if (!op2) {
                        op2 = "or ";
                    }
                });
                q += ")";
                if (!op) {
                    op = obj.titleOperator;
                }
            });
            q += ")";
        }
        if (obj.authors[0]) {
            if (concat) {
                q += "and";
            }
            concat = true;
            op = "";
            q += "(";
            obj.authors.forEach(function (author) {
                q += op + "(";
                op2 = "";
                authorIndices.forEach(function (authorIndex) {
                    if (authorIndex === yomiIndex) {
                        author = toKatakana(author);
                    }
                    q += op2 + select[authorIndex] + " contains\"" + author + "\"";
                    if (!op2) {
                        op2 = "or ";
                    }
                });
                q += ")";
                if (!op) {
                    op = obj.authorOperator;
                }
            });
            q += ")";
        }
        if (obj.publishers[0]) {
            if (concat) {
                q += "and";
            }
            concat = true;
            op = "";
            q += "(";
            obj.publishers.forEach(function (publisher) {
                q += op + "(";
                op2 = "";
                publisherIndices.forEach(function (publisherIndex) {
                    q += op2 + select[publisherIndex] + " contains\"" + publisher + "\"";
                    if (!op2) {
                        op2 = "or ";
                    }
                });
                q += ")";
                if (!op) {
                    op = obj.publisherOperator;
                }
            });
            q += ")";
        }
        if (publishyears.from || publishyears.until) {
            if (concat) {
                q += "and";
            }
            concat = true;
            q += "(";
            if (publishyears.from) {
                q += select[publishyearIndex] + ">=" + publishyears.from;
                if (publishyears.until) {
                    q += " and ";
                }
            }
            if (publishyears.until) {
                q += select[publishyearIndex] + "<=" + publishyears.until;
            }
            q += ")";
        }

        // remove keyboard (iPhone)
        document.activeElement.blur();
        //
        setResultsSize();

        const script = document.createElement("script");
        script.src = "https://docs.google.com/spreadsheets/d/1-XgySBso-vJoqMhmYgUZMtjcCY0qnjm-vIr3c6J7_M8/gviz/tq?tqx=out:json;responseHandler:callback&headers=1&sheet=%22" + sheetname + "%22&tq=" + encodeURIComponent(q);
        document.head.appendChild(script);
        // callback function callback() is called.
    } else {
        document.getElementById("results").innerHTML = "";
    }
    event.preventDefault();
}

function callback(json) {
    "use strict";
    var data = new google.visualization.DataTable(json.table);
    var view = new google.visualization.DataView(data);
    var table = new google.visualization.Table(document.getElementById("results"));
    view.hideColumns([hiddenIndex]);
    table.draw(view, {width: "100%"});
    google.visualization.events.addListener(table, "select", function () {
        var selection = table.getSelection();
        var row;
        var id;
        var a;
        if (selection.length > 0) {
            row = table.getSelection()[0].row;
            id = data.getValue(row, hiddenIndex);
            if (id.match(/^[0-9]+$/)) {
                a = document.getElementById("dummy");
                a.href = "https://id.ndl.go.jp/bib/" + id;
                a.click();
                a.href = "about:blank";
            }
            table.setSelection([]);
        }
    });
}
