function xor(str, key) {     
    str = String(str).split('').map(letter => letter.charCodeAt());
    let res = "";
    for (let i = 0; i < str.length; i++) res += String.fromCodePoint(str[i] ^ key);
    return res; 
}

function decode(data, xorKey) {
    if (data.startsWith('<?xml version="1.0"?>')) return data
    try {
        let decodeStr = xorKey ? this.xor(data, xorKey) : data
        decodeStr = urlB64(decodeStr, true) // atob doesn't work, would you believe it
        decodeStr = new Uint8Array(decodeStr.split('').map(x => x.charCodeAt(0)))
        return pako.inflate(decodeStr, {to: 'string'})
    }
    catch(e) { 
        // try AES decoding (mac saves)
        // ??
        // var aesOfb = new aesjs.ModeOfOperation.ofb(key, iv);
        // var decryptedBytes = aesOfb.decrypt(encryptedBytes);
        // console.log(decryptedBytes)
        return console.log(e) 
    }
}

function parseXML(data) {

    // parse basic values

    let raw = {}
    let res = {}

    for (i=0; i < data.children.length; i += 2) {
        let keyName = data.children[i].innerHTML
        if (keys[keyName]) keyName = keys[keyName]
        if (keyName == "[unused]") continue;
        let valueTag = data.children[i + 1]
        if (valueTag.tagName != "d") {
            let value = parseValue(valueTag)
            res[keyName] = value
        }
        else raw[keyName] = valueTag
    }

    // parse complex values

    Object.keys(raw).sort().forEach(x => {
        res[x] = parseDict(raw[x])
    })

    return res
}

function parseValue(tag) {
    let v = tag.innerHTML
    switch (tag.tagName) {
        case "r": return parseFloat(v)
        case "i": return parseInt(v)
        case "s": return v
        case "t": return true
        case "f": return false
    }
}

function maxPage(table, size) { return Math.floor((table.length-1)/size) + 1 }

function parseDict(dict, bruh) {
    if (!dict || !dict.children || !dict.children.length) return
    let dictObj = {}
    let i=0
    while (i < dict.children.length) { // needs a while loop for some reason??
        let keyName = dict.children[i].innerHTML
        let keyValue = dict.children[i + 1]
        if (keyValue && keyValue.children.length) dictObj[keyName] = parseDict(keyValue)
        else if (keyValue) dictObj[keyName] = parseValue(keyValue) 
        i += 2
    }
    return dictObj
}

function labelObject(data={}, keys, keyName) {
    let newObj = {}
    if (keyName) newObj["_key"] = keyName
    Object.keys(data).forEach(x => {
        if (x == "kCEK") return //newObj.encoder = kcekKeys[data[x]]
        else if (typeof keys[x] == "object") {
            let keyStuff = keys[x]
            let keyName = keys[x].name
            if (keyStuff.bump) newObj[keyName] = keyStuff.bump[+data[x] - 1]
            else if (keyStuff.arr) newObj[keyName] = keyStuff.arr[+data[x]]
            else if (keyStuff.b64 && data[x].length >= 4) newObj[keyName] = urlB64(data[x])
            else; //just to be scary
        }
        else newObj[keys[x] || x] = data[x]
    })
    return newObj
}

function superLabelObject(data={}, keys) {
    let newObj = {}
    Object.keys(data).forEach(x => newObj[x] = labelObject(data[x], keys))
    return newObj
}

function arrLabelObject(data={}, keys, includeKey) {
    let newArr = []
    Object.keys(data).forEach(x => newArr.push(labelObject(data[x], keys, includeKey ? x : null)))
    return newArr
}

function addStatDiv(name, statData, noComma) {
    $('#statDivs').append(`<div class="statCollection"><h2 stats="${name}">${name}</h2>
    <div class="allInline allMiddle statsDiv">${statData.map(x => !x[1] ? "<br>" : `<span title="${x[1]}"><p>${x[3] ? x[0] : commafy(x[0])}</p> <img src="assets/${x[2]}.png"></span>`).join("")}</div></div>`)
}

function rewardObject(reward, type) {
    let rewardObj = labelObject(reward, chestKeys)
    rewardObj.type = type
    delete rewardObj.rewards._isArr
    rewardObj.rewards = arrLabelObject(rewardObj.rewards, rewardKeys)
    rewardObj.rewards.forEach((x, y) => {
        if (type == "daily" && x.item == "Icon" && !x.iconForm) rewardObj.rewards[y].iconForm = "cube" 

        if (x.item != "Icon") { 
            delete rewardObj.rewards[y].iconForm; 
            delete rewardObj.rewards[y].iconID
        }
        else if (!x.iconForm) {
            rewardObj.rewards[y].item = "Custom"
            rewardObj.rewards[y].customID = x.iconID
            delete rewardObj.rewards[y].iconID
            delete rewardObj.rewards[y].iconForm
        }
    })
    rewardObj.name = type[0].toUpperCase() + type.slice(1).replace("Room", " Room")
    if (rewardObj.chest == "large" && (type == "daily" || type == "treasureRoom")) rewardObj.name = "Large " + rewardObj.name

    return rewardObj
}

function coinObject(coinList) {
    let coinObj = {online: {}, daily: {}, gauntlet: {}}
    coinList.forEach(x => {
        let coinStr = x.split("_")
        let coinType = coinStr[2] == "g" ? "gauntlet" : coinStr[2] ? "daily" : "online"
        if (!coinObj[coinType][coinStr[0]]) coinObj[coinType][coinStr[0]] = [false, false, false]
        coinObj[coinType][coinStr[0]][+coinStr[1] - 1] = true
    })
    return coinObj
}