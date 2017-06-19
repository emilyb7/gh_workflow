#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const request = require('request')

const gitConfig = fs.readFileSync(path.join(process.cwd(), './.git/config')).toString()
const repo_url = gitConfig.match(/url\s\=\s[^\n]+/)[0]
  .split("= ")[1]

const repo_name = repo_url.replace(/\.git$/, '').match(/[^\/][\w\-]+$/)[0]
const repo_owner = repo_url.replace("git@github.com:", "").replace(/\/.+$/, "")

// get auth token
const config = fs.readFileSync(path.join(__dirname, 'config.json'))
const token = JSON.parse(config).token

const query = `{ "query": "query { repository(name\:\\"${repo_name}\\" owner\:\\"${repo_owner}\\") { issues(last:25) { totalCount, nodes { number, title, url } } }}" }`

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

  console.log(`Searching for issues for repo ${repo_name} belonging to ${repo_owner}`);

  if (err) return console.log(err);

  const parsed = JSON.parse(body)

  if (parsed.errors) return console.log(parsed.errors)

  const totalCount = parsed.data.repository.issues.totalCount;

  const issues = parsed.data.repository.issues.nodes

  console.log(`
Showing ${issues.length} issue(s) out of total ${totalCount} issue(s) found

    `, printIssues(issues));
})
