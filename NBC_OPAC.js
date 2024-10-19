// change here! if column char or sheet name are modified in the sheet
const sheetname = "Sheet1";
const select = [
    // don't reindex. modify column char only
    "B", // 0 著者・編者
    "C", // 1 読み (no select)
    "D", // 2 シリーズ名
    "E", // 3 巻号
    "F", // 4 タイトル
    "H", // 5 出版者
    "J", // 6 出版年 (number)
    "K", // 7 分類記号
    "M", // 8 配架場所
    "L", // 9 NDL書誌ID (select but no display)
    "I", // 10 出版者備考 (no select)
    "G"  // 11 タイトル備考 (no select)
];
// begin: number in following lines denote index above
const indices = {
    // data type: text
    // element 0 of each array is for searching hint thus no select
    "author": [1, 0],
    "publisher": [10, 5],
    "title": [11, 2, 4]
};
const publishyearIndex = 6; // data type: number
const NDLBibIDIndex = 9; // select but no display
// end

var querySelect = "select ";
var hiddenColumnInSelect;
(function () {
    var op = "";
    var j = 0;
    var tmp = Object.values(indices).map(function (k) {return k[0];});
    select.forEach(function (c, i) {
        if (tmp.includes(i)) {
            // no select
            return;
        }
        if (i === NDLBibIDIndex) {
            // no display
            hiddenColumnInSelect = j;
        }
        querySelect += op + c;
        op = ",";
        j += 1;
    });
    querySelect += " where";
}());

const ro = new ResizeObserver(function () {
    setResultsSize();
});
(function () {
    return new Promise(function () {
        setTimeout(function () {
            var target;
            do {
                target = document.getElementById("wrapper");
            } while (!target);
            ro.observe(target);
        }, 10000);
    });
}());

function setResultsSize() {
    "use strict";
    var results = document.getElementById("results").style;
    var wrapper = document.getElementById("wrapper").getBoundingClientRect();
    var rect = document.getElementById("result-wrapper").getBoundingClientRect();
    if (rect.left === 0) {
        // portrait
        results.height = (wrapper.height - rect.top) + "px";
    } else {
        // landscape
        results.height = wrapper.height + "px";
    }
}

function toKatakana(s) {
    "use strict";
    return s.replace(/[ぁ-ゖ]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) + 0x60);
    });
}

function makeQueryString(ss, w) {
    "use strict";
    var q = "(";
    var op = "";
    ss.forEach(function (s) {
        indices[s].forEach(function (e) {
            if (e === indices.author[0]) { // yomi in Katakana
                q += op + select[e] + " contains\"" + toKatakana(w) + "\"";
            } else {
                q += op + select[e] + " contains\"" + w + "\"";
            }
            op = "or ";
        });
    });
    q += ")";
    return q;
}

function sendQuery(event) {
    "use strict";
    var obj = {};
    var publishyears = {};
    var q = "";
    var concat = querySelect;
    var op;
    ["keyword"].concat(Object.keys(indices)).forEach(function (s) {
        obj[s] = document.querySelector("input[name=\"" + s + "\"]").value.replace(/[\s\u3000"]+/g, " ").replace(/^\s*|\s*$/g, "").split(" ");
        obj[s + "Operator"] = (
            document.querySelector("input[name=\"" + s + "Or\"]").checked ?
            "or" :
            "and"
        );
    });
    if (obj.keyword[0]) {
        q += concat;
        concat = "and";
        op = "";
        q += "(";
        obj.keyword.forEach(function (w) {
            q += op + makeQueryString(Object.keys(indices), w);
            op = obj.keywordOperator;
        });
        q += ")";
    }
    Object.keys(indices).forEach(function (s) {
        if (obj[s][0]) {
            q += concat;
            concat = "and";
            op = "";
            q += "(";
            obj[s].forEach(function (w) {
                q += op + makeQueryString([s], w);
                op = obj[s + "Operator"];
            });
            q += ")";
        }
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
    if (publishyears.from || publishyears.until) {
        q += concat;
        op = "";
        q += "(";
        if (publishyears.from) {
            q += op + select[publishyearIndex] + ">=" + publishyears.from;
            op = " and ";
        }
        if (publishyears.until) {
            q += op + select[publishyearIndex] + "<=" + publishyears.until;
        }
        q += ")";
    }

    if (q) {
        // remove keyboard (iPhone)
        document.activeElement.blur();
        //
        setResultsSize();

        const script = document.createElement("script");
        script.src = "https://docs.google.com/spreadsheets/d/1EkyFIH99HibjaXD6GUQm1BRT-YunLXMc7GTV9c4U8yg/gviz/tq?tqx=out:json;responseHandler:callback&headers=1&sheet=%22" + sheetname + "%22&tq=" + encodeURIComponent(q);
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
    view.hideColumns([hiddenColumnInSelect]);
    table.draw(view, {width: "100%"});
    google.visualization.events.addListener(table, "select", function () {
        var selection = table.getSelection();
        var row;
        var id;
        var a;
        if (selection.length > 0) {
            row = table.getSelection()[0].row;
            id = data.getValue(row, hiddenColumnInSelect);
            if (id.match(/^[0-9]+$/)) {
                a = document.getElementById("dummy");
                a.href = "https://id.ndl.go.jp/bib/" + id;
                a.click();
            }
            table.setSelection([]);
        }
    });
}
