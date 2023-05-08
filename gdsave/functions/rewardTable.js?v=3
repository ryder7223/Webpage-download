function findReward(r, rType) {
    return (r.rewards.find(x => x.item == rType) || {}).amount || 0
}

function appendRewards(rewardList) {

        $('.rewardRow').remove()
        if (rewardList) chestTable = rewardList
        else rewardList = chestTable

        rewardList = rewardList.filter(x => allowedChests.includes(x.name))

        let maxPages = maxPage(rewardList, chestPageSize)
        if (chestPage <= 0) chestPage = 1
        if (chestPage > maxPages) chestPage = maxPages

        rewardList = rewardList.slice((chestPage-1)*chestPageSize, (chestPage-1)*chestPageSize + chestPageSize)
    
        if (chestPage == 1) { $('#chestLeft').addClass('greyed'); $('#chestStart').addClass('greyed') }
        else { $('#chestLeft').removeClass('greyed'); $('#chestStart').removeClass('greyed') }
    
        if (chestPage == maxPages) { $('#chestRight').addClass('greyed'); $('#chestEnd').addClass('greyed') }
        else { $('#chestRight').removeClass('greyed'); $('#chestEnd').removeClass('greyed') }

        $('#chestPage').val(chestPage).attr("max", maxPages)
        $('#chestTotal').text(maxPages)

        rewardList.forEach((x, n) => {

            let iconStr = ""
            let iconRewards = x.rewards.filter(x => x.item == "Icon")
            let customRewards = x.rewards.filter(x => x.item == "Custom")
            iconRewards.forEach(i => {
                let formStr = i.iconForm == "deathEffect" ? "Death" : i.iconForm[0].toUpperCase() + i.iconForm.slice(1)
                let iconURL = ["deathEffect", "trail"].includes(i.iconForm) ? 
                `https://gdbrowser.com/assets/${i.iconForm == "deathEffect" ? "deatheffects" : "trails"}/${i.iconID}.png`
                : ["color1", "color2"].includes(i.iconForm) ? `https://gdbrowser.com/assets/previewicons/color_${i.iconID}.png`
                : `https://gdbrowser.com/assets/previewicons/${i.iconForm}-${i.iconID < 10 ? "0" : ""}${i.iconID}.png`
                return iconStr += `<p><img style="height: 40px" src="${iconURL}">${formStr} #${i.iconID}</p>`
            })
             customRewards.forEach(i => {
                 let specialItem;
                 if (i.customID == 1) specialItem = "assets/key1.png"
                 if (i.customID == 2) specialItem = "assets/key2.png"
                 if (i.customID == 3) specialItem = "assets/key3.png"
                 if (i.customID == 5) specialItem = "assets/key4.png"
                 return iconStr += `<p><img style="height: 40px" src="${specialItem}">Special #${i.customID}</p>`
             })

            let chestImg = `chests/${x.type == "treasureRoom" ? "demon" : ""}${x.chest}`
            switch (x.type) {
                case "gauntlet": chestImg = "gauntlet"; break;
                case "weekly": chestImg = "weekly"; break;
                case "special": chestImg = "emblem"; break;
            }

            $('#rewardTable').append(`
            <tr class="rewardRow">
            <td class="center chest"><img style="height: 40px" src="assets/${chestImg}.png"></td>
            <td><p>${x.id || ""}</p></td>
            <td><p><img src="assets/orbs.png">${findReward(x, "Mana Orbs")}</p></td>
            <td><p><img src="assets/diamond.png">${findReward(x, "Diamonds")}</p></td>
            <td><p><img src="assets/key.png">${findReward(x, "Demon Key")}</p></td>
            <td><p><img src="assets/shards/fire.png">${findReward(x, "Fire Shard")}</p></td>
            <td><p><img src="assets/shards/ice.png">${findReward(x, "Ice Shard")}</p></td>
            <td><p><img src="assets/shards/poison.png">${findReward(x, "Poison Shard")}</p></td>
            <td><p><img src="assets/shards/shadow.png">${findReward(x, "Shadow Shard")}</p></td>
            <td><p><img src="assets/shards/lava.png">${findReward(x, "Lava Shard")}</p></td>
            <td>${iconStr}</td>
            </tr>`)
            $('#rewardTable td:not(.chest)').each(function() {
                if (!$(this).text() || $(this).text() == "0") $(this).html("")
            })
        })
    }

    
    $('#chestRight').click(function() {
        chestPage = Math.min(maxPage(chestTable, chestPageSize), chestPage + 1)
        appendRewards()
    })

    $('#chestLeft').click(function() {
        chestPage--
        appendRewards()
    })

    $('#chestStart').click(function() {
        chestPage = 1
        appendRewards()
    })

    $('#chestEnd').click(function() {
        chestPage = maxPage(chestTable, chestPageSize)
        appendRewards()
    })

    $('#chestPage').change(function() {
        chestPage = +$(this).val()
        appendRewards()
    })