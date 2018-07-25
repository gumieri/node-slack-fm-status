const LastfmAPI = require('lastfmapi')
const request = require('request-promise-native')

require('dotenv').config({ path: `${__dirname}/.env` })

const lastfm = new LastfmAPI({
  api_key: process.env.LASTFM_KEY,
  secret: process.env.LASTFM_SECRET
})

let currentTracks = []

if (!process.env.LASTFM_USERNAME) {
  console.log('No username specified')
  process.exit()
}

run()
setInterval(run, 10000)

function run () {
  lastfm.user.getRecentTracks({
    // limit: 1,
    user: process.env.LASTFM_USERNAME
  }, (err, data) => {
    if (err) {
      console.log(err)
      return
    }

    let track = data.track[0]
    let info = `${track.artist['#text']} - ${track.name}`
    if (currentTracks.includes(info)) return

    currentTracks.unshift(info)
    if (currentTracks.length > 2) {
      currentTracks.pop()
    }

    Promise.all(process.env.SLACK_TOKEN.split(',').map(token => {
      return request.post('https://slack.com/api/users.profile.set', {
        form: {
          token: token,
          profile: JSON.stringify({
            'status_text': info,
            'status_emoji': ':metal:'
          })
        }
      })
    }))
      .then(() => {
        console.log(`Now playing: ${info}`)
      })
  })
}

function exitHandler (options, err) {
  if (err) {
    console.log(err)
  }

  console.log('Exiting...')
  Promise.all(process.env.SLACK_TOKEN.split(',').map(token => {
    return request.post('https://slack.com/api/users.profile.set', {
      form: {
        token: process.env.SLACK_TOKEN,
        profile: JSON.stringify({
          'status_text': ``,
          'status_emoji': ''
        })
      }
    })
  }))
    .then(() => {
      process.exit()
    })
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup: true}))
// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}))
// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit: true}))
