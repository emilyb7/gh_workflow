#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const request = require('request')
const readline = require('readline');

// get auth token
const config = fs.readFileSync(path.join(__dirname, 'config.json'))
const token = JSON.parse(config).token

let pagination = 0
let lastId = ''

const getRepoDetails = dir => {

  if (!fs.existsSync(path.join(dir, './.git/config'))) {
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

const query = (name, owner, last) =>
  `{ "query": "query { repository(name\:\\"${name}\\" owner\:\\"${owner}\\") { nameWithOwner, homepageUrl, issues(last:25 ${ last ? 'before:\\"' + last + '\\"' : '' }) { totalCount, edges { cursor }, nodes { id, number, title, url } } }}" }`

const requestOptions = (name, owner, last) => ({
  uri: "https://api.github.com/graphql",
  body: query(name, owner, (last || null)),
  headers: {
    'Authorization' : `bearer ${token}`,
    'User-Agent': 'request',
  },
})

const issuesPublicUrl = (url) =>
`View all issues for this repo at ${url}}/issues`

const printEach = ({ number, title, url, }) => `
${"\x1b[0m"} #${number} ${"\x1b[35m"} ${title}  ${"\x1b[32m"} ${"\x1b[4m"} ${url}`

const printIssues = (issues, result = '') => {
  if (!issues.length) return result

  const nextResult = result + printEach(issues[0])
  return printIssues(issues.slice(1), nextResult)
}


const output = (err, res, body) => {

  if (err) return console.log(err);

  const parsed = JSON.parse(body)

  if (parsed.errors || parsed.message) {
    console.log({ errors: parsed.errors, message: parsed.message, });
    return
  }

  const { nameWithOwner, issues } = parsed.data.repository

  const [ owner, name, ] = nameWithOwner.split("/")

  console.log(`Searching for issues for repo ${name} belonging to ${owner}`)

  console.log(`
Showing ${issues.nodes.length} issue(s) out of total ${issues.totalCount} issue(s) found

    `, printIssues(issues.nodes),
    `${"\x1b[0m"}

    ${issuesPublicUrl(parsed.data.repository.homepageUrl)}
    `);

    if (issues.totalCount > pagination + 25) {

      pagination += 25
      lastId = issues.edges[0].cursor

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Do you want to see more issues? [ y / n ]', (answer) => {

        if (answer === 'y') {
          console.log({ lastId, });
          console.log(requestOptions(name, owner, lastId));
          request.post(requestOptions(name, owner, lastId), output)
        }

        rl.close();
      });

    }


}

const getIssues = dir => {

  const { repo_name, repo_owner, } = (getRepoDetails(dir))

  if (!repo_name || !repo_owner) return;

  request.post(requestOptions(repo_name, repo_owner), output)
}

getIssues(process.cwd())
