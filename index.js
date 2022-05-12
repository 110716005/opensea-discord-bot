const Discord = require('discord.js');
const { MessageEmbed } = require('discord.js');
const sdk = require('api')('@opensea/v1.0#5zrwe3ql2r2e6mn');
const ethPrice = require('eth-price');
const moment = require('moment');
const Web3 = require('web3');
const cache = require('./cache');
const _ = require('lodash');

const { token, minTokenID, maxTokenID, openseaApi, contractAddress } = require('./config.json');
const axios = require('axios');
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] })
const url = "https://api.opensea.io/api/v1/collection/alpacadabraz"


setInterval(() => {
    ethPrice('usd').then(res => {
        client.user.setActivity("$" + res[0].substr(5, res[0].length), { type: 'WATCHING' })
    })
    const lastSaleTime = cache.get('lastSaleTime', null) || moment().startOf('minute').subtract(59, "seconds").unix();
    console.log("lastSaleTime: " + lastSaleTime)
    axios.get('https://api.opensea.io/api/v1/events', {
        headers: {
            'X-API-KEY': openseaApi
        },
        params: {
            collection_slug: "beanzofficial",
            event_type: 'successful',
            occurred_after: lastSaleTime,
            only_opensea: 'false'
        }
    }).then(res => {
        const events = res.data.asset_events
        const sortedEvents = _.sortBy(events, function (event) {
            const created = _.get(event, 'created_date');

            return new Date(created);
        })
        sortedEvents.forEach(assetInfo => {
            let tokenID = assetInfo.asset.token_id
            let price = Web3.utils.fromWei(assetInfo.total_price, 'ether');
            let imgUrl = assetInfo.asset.image_url
            let created = assetInfo.created_date
            let exampleEmbed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Beanz #' + tokenID)
                .setURL('https://opensea.io/assets/' + contractAddress + '/' + tokenID)
                .setDescription("has just been sold for " + price + "Ξ")
                // cahnge image url
                .setImage(imgUrl)
                .setTimestamp(Date.parse(created))
            console.log(moment(created).add(moment.duration(8, 'hours')).unix())
            cache.set('lastSaleTime', moment(created).add(moment.duration(8, 'hours')).unix());
            client.channels.cache.get('974242160293576725').send({ embeds: [exampleEmbed] })
        })
    })
}, 3000)

//Listening on https://api.opensea.io

setInterval(() => {
    const lastListTime = cache.get('lastListTime', null) || moment().startOf('minute').subtract(59, "seconds").unix();
    console.log("ListTime: " + lastListTime)
    axios.get('https://api.opensea.io/api/v1/events', {
        headers: {
            'X-API-KEY': openseaApi
        },
        params: {
            collection_slug: "beanzofficial",
            event_type: 'created',
            occurred_after: lastListTime,
            only_opensea: 'false'
        }
    }).then(res => {
        const events = res.data.asset_events
        const sortedEvents = _.sortBy(events, function (event) {
            const created = _.get(event, 'created_date');

            return new Date(created);
        })
        sortedEvents.forEach(assetInfo => {
            let tokenID = assetInfo.asset.token_id
            let price = Web3.utils.fromWei(assetInfo.starting_price, 'ether');
            let imgUrl = assetInfo.asset.image_url
            let from = (assetInfo.seller.user == null) ? assetInfo.seller.user : assetInfo.seller.user.username
            let fromWallet = assetInfo.seller.address.substr(0, 8)
            let created = assetInfo.created_date
            let exampleEmbed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Beanz #' + tokenID)
                .setURL('https://opensea.io/assets/' + contractAddress + '/' + tokenID)
                .setDescription("has just been listed for " + price + "Ξ")
                .addFields(
                    { name: "By", value: (from == null) ? fromWallet : from }
                )
                // cahnge image url
                .setImage(imgUrl)
                .setTimestamp(Date.parse(created))
            console.log(moment(created).add(moment.duration(8, 'hours')).unix())
            cache.set('lastListTime', moment(created).add(moment.duration(8, 'hours')).unix() + 1);
            client.channels.cache.get('974243011485634610').send({ embeds: [exampleEmbed] })
        })
    })
}, 3000)


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log("Discord bot is Listening sales...")
});

client.on('message', msg => {
    const args = msg.content.slice('!'.length).trim().split(' ');
    const command = args.shift().toLowerCase();
    if (msg.content.toLowerCase() === '!floor') {
        axios
            .get(url)
            .then(async res => {
                msg.channel.send("Current floor price:" + res.data.collection.stats.floor_price.toString());
            })
            .catch(error => {
                console.error(error);
            });
    }
    if (command === 'azuki') {
        const tokebID = parseInt(args[0])
        if (!Number.isInteger(tokebID) || !(tokebID >= minTokenID) || !(tokebID <= maxTokenID)) {
            msg.channel.send("Wrong tokenID");
            return
        }
        sdk['retrieving-a-single-asset']({
            include_orders: 'false',
            asset_contract_address: contractAddress,
            token_id: tokebID.toString(),
            'X-API-KEY': openseaApi
        })
            .then(res => {
                const owner = res.owner.user.username
                const walletAddress = res.owner.address.substr(0, 8)
                const exampleEmbed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('Azuki #' + tokebID)
                    .setURL('https://opensea.io/assets/' + contractAddress + '/' + tokebID)
                    .addFields(
                        { name: 'Owner', value: (owner == null) ? walletAddress : owner },
                    )
                    // cahnge image url
                    .setImage(res.image_url)

                msg.channel.send({ embeds: [exampleEmbed] });
            })
            .catch(err => console.error(err));
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (commandName === 'fp') {
        axios
            .get(url)
            .then(async res => {
                await interaction.reply("Current floor price:" + res.data.collection.stats.floor_price.toString());
            })
            .catch(error => {
                console.error(error);
            });
    } else if (commandName === 'user') {
        await interaction.reply('User info.');
    }
});

client.login(token);