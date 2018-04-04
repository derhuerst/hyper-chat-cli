#!/usr/bin/env node
'use strict'

const mri = require('mri')
const envPaths = require('env-paths')

const pkg = require('./package.json')

const argv = mri(process.argv.slice(2), {
	boolean: ['help', 'h', 'version', 'v']
})

const defaultStorage = envPaths(pkg.name, {suffix: ''}).data

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    hyper-chat <name> [key]
Options:
    --storage  -s  Where to store the data.
                   Default: ${defaultStorage}
\n`)
	process.exit(0)
}

if (argv.version || argv.v) {
	process.stdout.write(`hyper-chat v${pkg.version}\n`)
	process.exit(0)
}

const catNames = require('cat-names')

const openChat = require('.')

const showError = (err) => {
	console.error(err)
	process.exit(1)
}

const storage = argv.storage || argv.s || defaultStorage
const name = argv._[0] || catNames.random()
let key = argv._[1] || null
if (key) {
	try {
		key = Buffer.from(key, 'hex')
	} catch (err) {
		showError(err)
	}
}

openChat(storage, key, name)
