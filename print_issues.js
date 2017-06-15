#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const request = require('request')

const package = fs.readFileSync(path.join(process.cwd(), 'package.json'))

const repo = JSON.parse(package).repository.url
const repo_url = repo.match(/https\:\/\/github\.com\/[\w\-]+\/[\w\-]+/)[0]
const repo_name = repo_url.match(/[^\/][\w\-]+$/)[0]
const repo_owner = repo_url.replace("https://github.com/", "").replace(`/${repo_name}`, "")

const config = fs.readFileSync(path.join(__dirname, 'config.json'))
const token = JSON.parse(config).token

const query = `{ "query": "query { repository(name\:\\"${repo_name}\\" owner\:\\"${repo_owner}\\") { issues(last:25) { nodes { number, title, url } } }}" }`

const printEach = ({ number, title, url, }) => `
${"\x1b[0m"} #${number} ${"\x1b[35m"} ${title}  ${"\x1b[32m"} ${"\x1b[4m"} ${url}`

const printIssues = (issues, result = '') => {
  if (!issues.length) return result

  const nextResult = result + printEach(issues[0])
  return printIssues(issues.slice(1), nextResult)
}

const requestOptions = {
  uri: "https://api.github.com/graphql",
  body: query,
  headers: {
    'Authorization' : `bearer ${token}`,
    'User-Agent': 'request',
  },
}

request.post(requestOptions, (err, res, body) => {
  const parsed = JSON.parse(body)

  if (parsed.errors) return console.log(parsed.error)

  console.log(printIssues(parsed.data.repository.issues.nodes));
})
