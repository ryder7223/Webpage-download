    function clean(text) {return text.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;").replace(/\=/g, "&#61;").replace(/\"/g, "&quot;").replace(/\'/g, "&apos;")}
    function urlB64(str) { return Base64.atob(str.replace(/_/g, '/').replace(/-/g, '+')) }
    function commafy(num) { return (num || 0).toString().replace(/(\d)(?=(\d\d\d)+$)/g, "$1,") }

    let reader = new FileReader()
    let parser = new DOMParser()
    let allowUploading = true
    let downloadMode = false
    let GameManagerXML

    let difficultyList = { 0: 'Unrated', 10: 'Easy', 20: 'Normal', 30: 'Hard', 40: 'Harder', 50: 'Insane' }

    // read uploaded file

    const fileInput = document.getElementById("fileInput");
    fileInput.addEventListener("change", function() {
        let selectedFile = this.files[0]
        readUploadedFile(selectedFile)
    }, false);

    function rejectInput(msg, extra) {
        if (extra) console.log(extra)
        $('#errorMsg').text(msg).show()
        $('#uploadMain').show()
        $('#inputLabel').removeClass('inactive')
        $('#uploadLoading').hide()
        $('#headsUp').hide()
        $('#inputLabel').removeClass('inactive')
        allowUploading = true
    }

    function downloadFile(dl, filename, hidePass, hideData) {
        if (hidePass) dl = dl.replace(/<k>GJA_002<\/k><s>(.+?)<\/s>/g, "<k>GJA_002</k><s></s>")
        if (hideData) dl = dl.replace(/<k>k4<\/k><s>(.+?)<\/s>/g, "<k>k4</k><s></s>")
        let textFile = new Blob([dl], {type: 'text/txt'});
        let downloader = document.createElement('a');
        downloader.href = URL.createObjectURL(textFile)
        downloader.dataset.downloadurl = ['text/txt', downloader.download, downloader.href].join(':');
        downloader.style.display = "none";
        downloader.download = filename
        downloader.target = "_blank"
        document.body.appendChild(downloader);
        downloader.click();
        document.body.removeChild(downloader);
    }

    function readUploadedFile(gameManagerFile) {
        if (!allowUploading) return
        allowUploading = false
        if (gameManagerFile.size / 1024 / 1024 >= 100) return rejectInput(msg)
        $('#uploadMain').hide()
        $('#inputLabel').addClass('inactive')
        $('#uploadLoading').show()
        let readGameManager = reader.readAsText(gameManagerFile)
        reader.onload = function(gameManager) {
            let decoded = decode(gameManager.target.result, 11)
            if (!decoded) return rejectInput(`Error decoding file! Are you sure this is a valid GD save?${gameManager.target.result.includes("왩") ? " (mac saves are not supported yet)" : ""}`)

            decoded = decoded
            .replace(/&(?!amp;)/g, "&amp;") // escape ampersands
            .replace(/<k>GLM_09<\/k><d>(.|\n)+?<\/d>/g, "") // remove GLM_09 (corrupted on lots of saves)
            .replace(/[^\x00-\x7F]/g, "?").replace(/[\0-\37]/g, "") // replace weird characters

            if (downloadMode) {
                downloadFile(decoded, "CCGameManager.xml", true)
                return $('#loadTxt').text("Save data downloaded!").css("color", "yellow").css("font-weight", "normal")
            }
 
            try { kowalskiAnalysis(decoded) }
            catch(e) {
                console.log(e)
                $('#loadTxt').hide()
                $('#oopsieWoopsie').show()
                $('#errorInfo').show().text(e.message ? `${e.name}: ${e.message}` : "Unknown error")
            }
        }
    }

// defined here so it can be accessed from console

    let data = {}
    let rawData = {}
    let levelData = []
    let levels = []

    let page = 1
    let pageSize = 20

    let chestPage = 1
    let chestPageSize = 100

    let searchTable = []
    let chestTable = []
    let allowedChests = []
    let loading = false

    //kowalskiAnalysis(CCGameManager)

function kowalskiAnalysis(CCGameManager) {

    GameManagerXML = CCGameManager
    let saveData = parser.parseFromString(CCGameManager, "text/xml")
    if (!saveData || !saveData.children || !saveData.children.length) return rejectInput("Error parsing XML file! Are you sure this is your save data?", saveData)
    saveData = saveData.children[0].children[0]
    if (saveData.children[0].innerHTML.startsWith("LLM")) return levelAnalysis(saveData)
    if (saveData.tagName == "parsererror") return rejectInput("Error parsing save file! It may contain some corrupt data.", saveData)
    else if (saveData.tagName != "dict") return rejectInput("Error parsing save file! Are you sure this is your save data?", saveData)

    // parse!!
    data = parseXML(saveData)
    
    if (!data.playerUDID || !data.playerFrame || !data.binaryVersion) return rejectInput("Valid XML file, but probably not a GD save. Try again silly.")

    // construct data.stats

    let betterStats = {collectedCoins: {}}
    Object.keys(data.stats || {}).forEach(x => {
        let keyName = statKeys[x] || x
        if (keyName.includes("unique")) {
            let coinData = keyName.split("_")
            let coinCollected = data.stats[x] == "1"
            if (!Number(coinData[1])) betterStats.collectedCoins[coinData[1]] = coinCollected
            else {
                if (!betterStats.collectedCoins[coinData[1]]) betterStats.collectedCoins[coinData[1]] = []
                betterStats.collectedCoins[coinData[1]][+coinData[2] - 1] = coinCollected
            }
        }
        else betterStats[keyName] = data.stats[x]
    })
    data.stats = betterStats

    // we only need the keys for these ezpz

    let keysOnly = ["followedAccounts", "reportedLevels", "userCoins", "bronzeUserCoins", "completedLevels", "ratedDemons", "ratedLevels", "recentlyPlayed", "likes"]
    keysOnly.forEach(x => { data[x] = Object.keys(data[x] || {}) })


    // liked and disliked levels
    let betterLikes = { levels: [], comments: [], accountComments: [] }
    data.likes.forEach(x => {
        let lk = x.split("_")
        let likeObj = {id: lk[2], liked: lk[3] == 1, disliked: lk[3] == 0}
        if (lk[1] == 2) likeObj.levelID = lk[4]
        else if (lk[1] == 3) likeObj.commentID = lk[4]
        betterLikes[lk[1] == 1 ? "levels" : lk[1] == 2 ? "comments" : "accountComments"].push(likeObj)
    })
    data.likes = betterLikes


    // user coins
    data.userCoins = coinObject(data.userCoins)
    data.bronzeUserCoins = coinObject(data.bronzeUserCoins).online

    // level info

    let levelTypes = ["Official", "Online", "Daily", "Gauntlet"]
    let levelInfo = ["officialLevels", "onlineLevels", "timelyLevels", "gauntlets"]
    levelInfo.forEach((x, y) => {
        data[x] = arrLabelObject(data[x], levelKeys)
        data[x].forEach(x => {

            x.type = levelTypes[y]
            if (x.stars) x.estimatedDifficulty = x.difficulty || starDifficulties[x.stars]
            if (x.demonType) x.demonDifficulty = demonTypes[x.demonType]

            if (!x.difficulty && x.ratingScore2) {
                if (x.auto) x.difficulty = "Auto"
                else if (x.demon) x.difficulty = (x.demonDifficulty ? x.demonDifficulty + " Demon" : "Demon")
                else x.difficulty = difficultyList[x.ratingScore2]
            }

            x.liked = !!data.likes.levels.find(y => x.id == y.id && y.liked)
            x.disliked = !!data.likes.levels.find(y => x.id == y.id && y.disliked)
            x.starRated = !!data.ratedLevels.includes(String(x.id))
            x.demonRated = !!data.ratedDemons.includes(String(x.id))
            x.reported = !!data.reportedLevels.includes(String(x.id))

            if (x.type == "Official") x.collectedCoins = data.stats.collectedCoins[x.id]
            else x.collectedCoins = data.userCoins[x.type.toLowerCase()][x.id] || data.bronzeUserCoins[x.id]
            if (!x.collectedCoins) delete x.collectedCoins

            if (x.type == "Daily" && x.timelyID >= 100000) x.type = "Weekly"
            if (x.levelData) delete x.levelData
        })
        levels = levels.concat(data[x])
    })

    // misc key names

    data.songInfo = superLabelObject(data.songInfo, songKeys)
    data.quests = arrLabelObject(data.quests, questKeys)
    data.queuedQuests = arrLabelObject(data.queuedQuests, questKeys)

    // valueKeeper - contains settings + unlocked icons

    data.settings = { editor: {}, parental: {} }
    data.unlockedIcons = { "primaryColors": [], "secondaryColors": [], "cubes": [], "ships": [], "balls": [],
                  "ufos": [], "waves": [], "robots": [], "spiders": [], "trails": [], "deathEffects": [] }
    Object.keys(data.valueKeeper || {}).forEach(x => {
        let val = x.split("_")
        let valID = +val[1]
        let v = data.valueKeeper[x]
        let vb = v == "1"
        if (val[0] != "gv" && v == "0") return
        switch (val[0]) {
            case "gv": 
                let settingName = gameVariables[val[1]] || val[1]
                let settingType = settingName.split(".")
                if (["editor", "parental"].includes(settingType[0])) return data.settings[settingType[0]][settingType[1]] = v
                else return data.settings[settingName] = v
            case "c0": return data.unlockedIcons.primaryColors.push(valID)
            case "c1": return data.unlockedIcons.secondaryColors.push(valID)
            case "i": return data.unlockedIcons.cubes.push(valID)
            case "ship": return data.unlockedIcons.ships.push(valID)
            case "ball": return data.unlockedIcons.balls.push(valID)
            case "bird": return data.unlockedIcons.ufos.push(valID)
            case "dart": return data.unlockedIcons.waves.push(valID)
            case "robot": return data.unlockedIcons.robots.push(valID)
            case "spider": return data.unlockedIcons.spiders.push(valID)
            case "special": return data.unlockedIcons.trails.push(valID)
            case "death": return data.unlockedIcons.deathEffects.push(valID)
        }
    })

    // unlockValueKeeper (game events)

    data.events = {}
    Object.keys(data.unlockValueKeeper || {}).forEach(x => {
        data.events[gameEvents[x.split("_")[1]]] = data.unlockValueKeeper[x] == "1"
    })
    delete data.valueKeeper
    delete data.unlockValueKeeper

    // sort data.unlockedIcons for neatness

    Object.keys(data.unlockedIcons || {}).forEach(x => { data.unlockedIcons[x] = data.unlockedIcons[x].sort((a, b) => a - b) })

    // icon object

    data.icons = {}
    let icons = {
        cube: "playerFrame",
        ship: "playerShip",
        ball: "playerBall",
        ufo: "playerBird",
        wave: "playerDart",
        robot: "playerRobot",
        spider: "playerSpider",
        trail: "playerStreak",
        deathEffect: "playerDeathEffect",
        color1: "playerColor",
        color2: "playerColor2",
        glow: "playerGlow",
    }

    Object.keys(icons).forEach(x => {
        data.icons[x] = data[icons[x]]
        delete data[icons[x]] 
    })

    // username and icon
        $('#username').html(data.playerName)
        $('#gdIcon').attr('src', `https://gdbrowser.com/icon/icon?icon=${data.icons.cube}&col1=${data.icons.color1}&col2=${data.icons.color2}${data.icons.glow ? "&glow=1" : ""}`)

    // keybinds??? idk
        if (!data.keybinds) delete data.keybinds
        if (!data.keybinds2) delete data.keybinds2

    // map pack stars
    let mpRewards = {}
    Object.keys(data.mapPackStars || {}).forEach(x => {
        mpRewards[x.slice(5)] = data.mapPackStars[x]
    })
    data.mapPackStars = mpRewards

    // diamond rewards
    data.diamondRewards = { daily: {}, quests: {} }
    Object.keys(data.questRewards || {}).forEach(x => {
        data.diamondRewards[x[0] == "c" ? "quests" : "daily"][x.slice(1)] = data.questRewards[x]
    })
    delete data.questRewards

    // daily chests

    let betterRewards = { small: [], large: [] }
    Object.keys(data.dailyRewards || {}).forEach(x => {
        let rewardObj = rewardObject(data.dailyRewards[x], "daily")
        betterRewards[rewardObj.chest].push(rewardObj)
    })
    data.dailyRewards = betterRewards

    // treasure chests

    let treasureRewards = { small: [], large: [] }
    Object.keys(data.treasureRoomRewards || {}).forEach(x => {
        let rewardObj = rewardObject(data.treasureRoomRewards[x], "treasureRoom")
        treasureRewards[rewardObj.chest].push(rewardObj)
    })
    data.treasureRoomRewards = treasureRewards

    // weekly demon rewards

    let weeklyRewards = []
    Object.keys(data.weeklyRewards || {}).forEach(x => {
        let rewardObj = rewardObject(data.weeklyRewards[x], "weekly")
        rewardObj.id = String(Number(x.slice(1)) - 100000)
        weeklyRewards.push(rewardObj)
    })
    data.weeklyRewards = weeklyRewards

    // misc + gauntlet rewards

    let miscRewards = []
    let gauntletRewards = []
    Object.keys(data.rewards || {}).forEach(x => {
        let isGauntlet = x.startsWith("g_")
        let rewardObj = rewardObject(data.rewards[x], isGauntlet ? "gauntlet" : "special")
        if (isGauntlet) gauntletRewards.push(rewardObj)
        else miscRewards.push(rewardObj)
    })
    data.rewards = miscRewards
    data.gauntletRewards = gauntletRewards

    $('.chestType').each(function() { allowedChests.push($(this).attr('chest')) })

    // FAQ
    FAQ.forEach(x => {
        $('#questions').append(`<div><img src="assets/${x.i}.png"><h2>${x.q}</h2></div><p>${x.a}</p><br><br>`)
    })

    // display stats

    addStatDiv("Basic Stats", [
        [data.stats.stars, "Stars", "star"],
        [data.stats.diamonds, "Diamonds", "diamond"],
        [data.stats.mapPacks, "Map Packs", "folder"], [],
        [data.stats.jumps, "Jumps", "jumps"],
        [data.stats.attempts, "Attempts", "attempts"],
        [data.stats.destroyedPlayers, "Menu Icons Destroyed", "death"],
    ])

    addStatDiv("Coins", [
        [data.stats.coins, "Secret Coins", "coin"],
        [data.stats.userCoins, "User Coins", "silvercoin"],
        [data.bronzeUserCoins.length, "Unverified User Coins", "browncoin"],
    ])

    addStatDiv("Currencies", [
        [`${commafy(data.stats.orbs)}/${commafy(data.stats.totalOrbs)}`, "Mana Orbs", "orbs"], [],
        [`${commafy(data.stats.demonKeys)}/${commafy(data.totalDemonKeys)}`, "Demon Keys", "key"],
    ])

    data.stats.bonusShards = Math.min(...[data.stats.fireShards, data.stats.iceShards, data.stats.poisonShards, data.stats.shadowShards, data.stats.lavaShards])
    addStatDiv("Shards", [
        [data.stats.fireShards, "Fire Shards", "shards/fire"],
        [data.stats.iceShards, "Ice Shards", "shards/ice"],
        [data.stats.poisonShards, "Poison Shards", "shards/poison"], [],
        [data.stats.shadowShards, "Shadow Shards", "shards/shadow"],
        [data.stats.lavaShards, "Lava Shards", "shards/lava"],
        [data.stats.bonusShards, "Bonus Shards", "shards/bonus"],
    ])

    let completedLevels = levels.filter(x => x.type != "Official" && x.percentage >= 100)
    addStatDiv("Online Levels", [
        [completedLevels.filter(x => x.stars == 1).length, "Auto, 1*", "diff/1"],
        [completedLevels.filter(x => x.stars == 2).length, "Easy, 2*", "diff/2"],
        [completedLevels.filter(x => x.stars == 3).length, "Normal, 3*", "diff/3"],
        [completedLevels.filter(x => x.stars == 4).length, "Hard, 4*", "diff/4"], [],
        [completedLevels.filter(x => x.stars == 5).length, "Hard, 5*", "diff/5"],
        [completedLevels.filter(x => x.stars == 6).length, "Harder, 6*", "diff/6"],
        [completedLevels.filter(x => x.stars == 7).length, "Harder, 7*", "diff/7"],
        [completedLevels.filter(x => x.stars == 8).length, "Insane, 8*", "diff/8"], [],
        [completedLevels.filter(x => x.stars == 9).length, "Insane, 9*", "diff/9"],
        [completedLevels.filter(x => x.stars == 10).length, "Demon, 10*", "diff/10"],
        [completedLevels.filter(x => !x.stars).length, "Unrated", "nostar"]
    ])

    addStatDiv("Completed Demons", [
        [data.officialLevels.filter(x => x.demon && x.percentage >= 100).length, "Official Demons", "official"],
        [completedLevels.filter(x => x.demon && x.demonType == 3).length, "Easy Demons", "demons/easy"],
        [completedLevels.filter(x => x.demon && x.demonType == 4).length, "Medium Demons", "demons/medium"],
        [completedLevels.filter(x => x.demon && x.demonType == 5).length, "Insane Demons", "demons/insane"], [],
        [completedLevels.filter(x => x.demon && x.demonType == 6).length, "Extreme Demons", "demons/extreme"],
        [completedLevels.filter(x => x.demon && (x.demonType == 1 || !x.demonType)).length, "Unknown Demons", "demons/unknown"],
    ])

    let dailies = data.timelyLevels.filter(x => x.timelyID < 100000)
    let weeklies = data.timelyLevels.filter(x => x.timelyID >= 100000)

    addStatDiv("Completed Level Types", [
        [levels.filter(x => x.type == "Official" && x.percentage >= 100).length, "Official Levels", "official"],
        [completedLevels.filter(x => x.type == "Online").length, "Online Levels", "online"],
        [completedLevels.filter(x => x.type == "Gauntlet").length, "Gauntlet Levels", "gauntlet"], [],
        [`${commafy(dailies.filter(x => x.percentage == "100").length)}/${commafy(dailies.length)}`, "Daily Levels", "daily"],
        [`${commafy(weeklies.filter(x => x.percentage == "100").length)}/${commafy(weeklies.length)}`, "Weekly Levels", "weekly"],
    ])

    let specialItems = []
    if (data.events.demonKey1) specialItems.push([" ", "Demon Key 1", "key1"])
    if (data.events.demonKey2) specialItems.push([" ", "Demon Key 2", "key2"])
    if (data.events.demonKey3) specialItems.push([" ", "Demon Key 3", "key3"])
    if (data.events.foundMasterEmblem) specialItems.push([" ", "Master Emblem", "emblem"])
    if (data.events.monsterFreed) specialItems.push([" ", "Demon Gauntlet", "key4"])
    addStatDiv("Special Items", specialItems)

    addStatDiv("Level Interactions", [
        [data.stats.likedLevels, "Liked Levels", "buttons/vote"],
        [data.stats.ratedLevels, "Rated Levels", "buttons/rate"],
        [data.ratedDemons.length, "Rated Demons", "buttons/demon"],
        [data.reportedLevels.length, "Reported Levels", "buttons/report"], [],
        [levels.filter(x => x.practicePercentage > 0).length, "Practiced Levels", "buttons/practice"],
        [levels.filter(x => x.leaderboardPercentage > 0).length, "Leaderboard Submissions", "buttons/score"],
        [levels.filter(x => x.favorited).length, "Favorited Levels", "heart"],
        [levels.filter(x => x.folder > 0).length, "Levels in Folders", "folder"],
    ])
    
    addStatDiv("Chests Opened", [
        [data.dailyRewards.small.length, "Small Daily Chests", "chests/small"],
        [data.dailyRewards.large.length, "Large Daily Chests", "chests/large"], [],
        [data.treasureRoomRewards.small.length, "Treasure Room Chest", "chests/demonsmall"],
        [data.treasureRoomRewards.large.length, "Large Treasure Room Chest", "chests/demonlarge"],
    ])

    let passwordStuff = zxcvbn(data.password || "")
    let passwordDays = passwordStuff.guesses / 86400
    let passwordYears = passwordDays / 365.25
    passwordYears = (Math.round(passwordYears) <= 5 ? `${Math.round(passwordDays)} days` : passwordYears >= 99999 ? "99999+ years" : `${Math.round(passwordYears)} years`)

    addStatDiv("Account", [
    [data.accountID || "0", "Account ID", "profile", true],
    [data.playerID || "0", "Player ID", "profile2", true], [],
    [data.password ? `${["Awful", "Cringe", "Risky", "Decent", "Secure"][passwordStuff.score]} (${passwordYears})` : "No Password", "Password Strength", "lock", true], [],
    ])
    passwordStuff = null
    delete data.password

    $(".statsDiv span").hover(function() { 
        $(this).parent().parent().find('h2').text($(this).attr('title')).addClass('helpTitle')
    }, function() {
        let statHeader = $(this).parent().parent().find('h2')
        statHeader.text(statHeader.attr('stats')).removeClass('helpTitle')
    })

    data.allRewards = data.dailyRewards.large
    .concat(data.dailyRewards.small)
    .concat(data.treasureRoomRewards.small)
    .concat(data.treasureRoomRewards.large)
    .concat(data.gauntletRewards)
    .concat(data.weeklyRewards)
    .concat(data.rewards)

    appendToTable([...levels])
    appendRewards([...data.allRewards])
    buildDiffTable()
    appendQuests()
    miscData(data)
    loadButtons()

    $('#uploadDiv').hide()
    $('#gdstats').show()

}
