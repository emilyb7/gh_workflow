#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const request = require('request')

// get auth token
const config = fs.readFileSync(path.join(__dirname, 'config.json'))
const token = JSON.parse(config).token

const getRepoDetails = dir => {

  if (!fs.exists(path.join(dir, './.git/config'))) {
    console.log("this directory does not have a git config");
    return {
      repo_name: '',
      repo_owner: '',
    }
  }

  const gitConfig = fs
    .readFileSync(path.join(dir, './.git/config'))
    .toString()

  const repo_url = gitConfig.match(/url\s\=\s[^\n]+/)[0]
    .split("= ")[1]

  return {
    repo_name: repo_url.replace(/\.git$/, '').match(/[^\/][\w\-]+$/)[0],
    repo_owner: repo_url.replace("git@github.com:", "").replace(/\/.+$/, ""),
  }
}

const query = (name, owner) =>
  `{ "query": "query { repository(name\:\\"${name}\\" owner\:\\"${owner}\\") { issues(last:25) { totalCount, nodes { number, title, url } } }}" }`

const printEach = ({ number, title, url, }) => `
${"\x1b[0m"} #${number} ${"\x1b[35m"} ${title}  ${"\x1b[32m"} ${"\x1b[4m"} ${url}`

const printIssues = (issues, result = '') => {
  if (!issues.length) return result

  const nextResult = result + printEach(issues[0])
  return printIssues(issues.slice(1), nextResult)
}

const requestOptions = (name, owner) => ({
  uri: "https://api.github.com/graphql",
  body: query(name, owner),
  headers: {
    'Authorization' : `bearer ${token}`,
    'User-Agent': 'request',
  },
})

const getIssues = dir => {

  const { repo_name, repo_owner, } = (getRepoDetails(dir))

  if (!repo_name || !repo_owner) return;

  request.post(requestOptions(repo_name, repo_owner), (err, res, body) => {

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
}

getIssues(process.cwd())
