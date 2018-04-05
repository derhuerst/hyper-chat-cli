'use strict'

const hyperdb = require('hyperdb')
const createUI = require('really-basic-chat-ui')

const findPeers = require('./lib/find-peers')

const onceAuthorized = (db, key, cb) => {
	const check = () => {
		db.authorized(key, (err, isAuthorized) => {
			if (err) cb(err)
			else if (isAuthorized === true) cb(null)
			else db.once('append', check) // todo: correct event?
		})
	}
	setImmediate(check)
}

const onReady = (db, name) => {
	findPeers(db.discoveryKey, (peer) => {
		const s = db.replicate({live: true})
		s.pipe(peer).pipe(s)
	})

	db.put('names/' + db.local.key.toString('hex'), name, (err) => {
		if (err) console.error(err)
		// todo: handle error
	})

	// state
	const msgs = [{
		from: name,
		when: Date.now(),
		content: `The key for this chat is ${db.key.toString('hex')}.`
	}]
	let unauthorizedError = `Tell someone to authorize ${db.local.key.toString('hex')}.`
	let err = null

	const send = (content) => {
		if (content.slice(0, 12) === ':authorize ') {
			let key = content.slice(12).trim()
			if (!validKey.test(key)) {
				err = 'Invalid key.'
				rerender()
				return
			}
			key = Buffer.from(key, 'hex')

			db.authorize(key, (err) => {
				if (err) console.error(err)
				if (err) return null // todo: handle error
				msgs.push({
					from: name,
					when: Date.now(),
					content: `I authorized ${key.toString('hex')}.`
				})
				rerender()
			})
		} else {
			const from = db.local.key.toString('hex')
			const t = Date.now()
			const val = {from, when: t, content}
			db.put('msgs/' + t + '-' + from, val, (err) => {
				if (err) console.error(err)
				// todo: handle error
			})
		}
	}

	const render = createUI(send)
	const rerender = () => {
		render(db.opened, msgs, unauthorizedError || err || null)
	}
	setImmediate(rerender)

	onceAuthorized(db, db.local.key, (err) => {
		if (err) console.error(err)
		if (err) return null // todo

		unauthorizedError = null
		rerender()
	})

	const seen = Object.create(null)
	const onRow = (row) => {
		if (seen[row.key]) return null
		seen[row.key] = true

		const key = row.key.split('/')
		if (key[0] !== 'msgs') return
		const peer = (key[1] || '').split('-')[1]
		db.get('names/' + peer, (err, [name]) => {
			if (err) console.error(err)
			if (err) return null // todo: handle error

			msgs.push({
				from: name && name.value || 'oops',
				when: row.value.when,
				content: row.value.content
			})
			rerender()
		})
	}

	const onAppend = (feed) => {
		const h = db.createHistoryStream({reverse: true})
		h.once('data', (row) => {
			h.destroy()
			onRow(row)
		})
	}
	db.on('remote-update', onAppend)
	db.on('append', onAppend)

	// todo: mafintosh/hyperdb#92
	db.createHistoryStream().on('data', onRow)
}

const openChat = (dir, key, name) => {
	const db = hyperdb(dir, key, {
		valueEncoding: 'json'
	})

	db.ready((err) => {
		if (err) return null // todo
		onReady(db, name)
	})
}

module.exports = openChat
