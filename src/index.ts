import { getInput, setOutput } from '@actions/core';
import { context } from '@actions/github';
import { existsSync, outputFile } from 'fs-extra';
import { join } from 'path';
import { stringify } from 'yaml';

import { Err_DontGetNewsLink, Err_SameNameFile } from './toMarkdownConstant';
import {
  HTMLtoMarkdown,
  addComment,
  getRouteAddr,
  loadPage
} from './utilities';

(async () => {
  const newsLink = getInput('newsLink'),
    includeSelector = getInput('includeSelector'),
    ignoreSelector = getInput('ignoreSelector'),
    skipIssueComment = getInput('skipIssueComment') === 'true',
    skipSameArticleCheck = getInput('skipSameArticleCheck') === 'true',
    markDownFilePath = getInput('markDownFilePath') || './';

  if (!newsLink) throw new Error(Err_DontGetNewsLink);

  const path = getRouteAddr(newsLink);
  const filePath = join(
    markDownFilePath,
    path.split('/').filter(Boolean).at(-1) + '.md'
  );
  // When the file already exists, throw an error, unless the skipSameArticleCheck option is set to true.
  // Because some special cases may need to overwrite the existing file, such as the content of the article has been updated.
  // OR, just rerun the action to do further processing. Action should not be responsible for this.
  if (!skipSameArticleCheck && existsSync(filePath))
    throw new URIError(Err_SameNameFile);

  const { document } = await loadPage(path);

  if (includeSelector) {
    const includeElement = document.querySelectorAll(includeSelector);
    if (includeElement) {
      document.body.innerHTML = '';
      document.body.append(...includeElement);
    }
  }

  const { meta, content } = HTMLtoMarkdown(document, ignoreSelector);

  const articleText = `---
${stringify({
  ...meta,
  originalURL: path,
  translator: '',
  reviewer: ''
}).trim()}
---

${content.replace('\n\n', '\n\n<!-- more -->\n\n')}`;

  await outputFile(filePath, articleText);

  const { repo, ref } = context;
  const successMessage = `
- Original URL: [${meta.title}](${path})
- Original author: [${meta.author || 'anonymous'}](${meta.authorURL})
- Markdown file: [click to edit](https://github.com/${repo.owner}/${
    repo.repo
  }/edit/${join(ref.replace(/^refs\/heads\//, ''), filePath)})`;

  // Sometimes, the issue comment is not needed, such as further processing will do.
  if (!skipIssueComment) await addComment(successMessage.trim());

  // return  filePath
  setOutput('markdown_file_path', filePath);
})().catch(async (error) => {
  console.log('ERR:', error);
  await addComment(error + '');
  process.exit(1);
});
