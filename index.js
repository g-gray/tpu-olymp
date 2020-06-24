const jsSHA = require('jssha')
const xhttp = require('xhttp/node')

const YEARS = ['2020', '2019', '2018', '2017', '2016']
const OLYMPS = ['', 'mos', 'mun', 'reg', 'mw', 'eu']

const ORIGIN = 'https://diploma.olimpiada.ru'
const NOT_FOUND = 404

;(async function() {
  const result = await search(
    'Иванов',
    'Иван',
    'Иванович',
    '2000-01-01'
  )

  console.info(`result:`, result)
})()

function search(
  lastName = '',
  firstName = '',
  middleName = '',
  birthDate = ''
) {
  const personString = [lastName, firstName, middleName, birthDate]
    .join(' ')
    .toLowerCase()
    .replace(/(([- ]|^)[^ ])/g, (ch) => ch.toUpperCase())
    .replace(/ +/g, ' ')

  return fetchOlymps(strToHash(personString))
}

function strToHash(str) {
  const shaObj = new jsSHA('SHA-256', 'TEXT')
  shaObj.update(str)
  return shaObj.getHash('HEX')
}

async function fetchOlymps(personHash) {
  const result = {}

  // Sequential fetching
  // for(var i = 0; i < YEARS.length; i++) {
  //   for(var j = 0; j < OLYMPS.length; j++) {
  //     try {
  //       const diplomas = await fetchOlympData(OLYMPS[j], YEARS[i], hash)
  //       result[YEARS[i]] = (result[YEARS[i]] || []).concat(diplomas || [])
  //     }
  //     catch (err) {
  //       console.info(`err:`, err)
  //     }
  //   }
  // }

  // Simultaneous fetching
  const rows = await Promise.all(YEARS.map((year) => {
    return Promise.all(OLYMPS.map((olymp) => {
      return fetchOlympData(olymp, year, personHash)
    }))
  }))

  YEARS.forEach((year, yearIdx) => {
    OLYMPS.forEach((_, olympIdx) => {
      result[year] = (result[year] || [])
        .concat(rows[yearIdx][olympIdx] || [])
    })
  })

  return result
}

async function fetchOlympData(olymp, year, personHash) {
  let olympDataText

  try {
    const {body} = await fetch({
      method: 'GET',
      url: url(ORIGIN, olymp, year, personHash),
    })
    olympDataText = body
  }
  catch (response) {
    const {status} = response
    if (status === NOT_FOUND) {
      return null
    }

    throw response
  }

  return textToArr(olympDataText)
}

function url(origin, olymp, year, personHash) {
  return `${origin}/files/rsosh-diplomas-static/compiled-storage-${olymp}${year}/by-person-released/${personHash}/codes.js`
}

function fetch(params) {
  return new Promise((resolve, reject) => {
      xhttp.jsonRequest(params, (err, response) => {
        if (response.ok) resolve(response)
        else reject(response, err)
    })
  })
}

function textToArr(str) {
  const tmp = str.split('=')
  // Weird and unsafe solution. Must be replaced by a safe parser
  return eval(tmp[1])
}
