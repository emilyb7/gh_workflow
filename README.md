# gh_workflow
improving github workflow

`print_issues.js` prints a list of all issues for a git repo to the console.

To run this:
- create a new auth token on github
- clone this project
- store your token in a `config.json` file in the root of your directory. Should like like.
``` json
{ "token": "{YOUR_TOKEN}" }
```
- `[sudo] npm link` 
- then run `print_issues` from any project directory (must have a package.json containing the url of the project's github repo)
