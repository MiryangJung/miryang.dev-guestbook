const setCache = (key, data) => GuestBook.put(key, data)
const getCache = key => GuestBook.get(key)
const getList = () => GuestBook.list()

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://miryang.dev',
  'Access-Control-Allow-Methods': 'GET,POST',
}

async function getGuestbook(request) {
  const params = new URL(request.url).searchParams
  const type = params.get('type')
  const key = params.get('key')
  let data = ''
  if (type === 'list') {
    const list = await getList()
    data = JSON.stringify(list.keys)
  } else if (type === 'all') {
    const list = await getList()
    let obj = {}
    for (const item of list.keys) {
      const cache = await getCache(item.name)
      obj[item.name] = JSON.parse(cache)
    }
    data = JSON.stringify(obj)
  } else if (type === 'data' && key) {
    const cache = await getCache(key)
    if (cache) {
      data = JSON.stringify(cache)
    }
  }
  return new Response(data, {
    headers: { 'Content-Type': 'application/json' },
  })
}

async function updateGuestbook(request) {
  const ip = request.headers.get('CF-Connecting-IP')
  const body = await request.text()
  try {
    const json = JSON.parse(body)
    if (!json.token || json.token !== API_TOKEN) {
      return new Response('nope!', { status: 401 })
    }
    const originData = await getCache(json.key)
    let newData
    if (originData) {
      const originJson = JSON.parse(originData)
      newData = [{ ...json.data, ip: ip }, ...originJson]
    } else {
      newData = [{ ...json.data, ip: ip }]
    }
    await setCache(json.key, JSON.stringify(newData))
    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(err, { status: 500, headers: corsHeaders })
  }
}

async function handleRequest(request) {
  const origin = request.headers.get('origin')
  if (origin !== 'https://miryang.dev') {
    return new Response(null, { status: 403 })
  }
  if (request.method === 'POST') {
    return updateGuestbook(request)
  } else {
    return getGuestbook(request)
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
