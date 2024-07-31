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
    ignoreSelector = getInput('ignoreSelector'),
    markDownFilePath = getInput('markDownFilePath') || './';

  if (!newsLink) throw new Error(Err_DontGetNewsLink);

  const path = getRouteAddr(newsLink);
  const filePath = join(
    markDownFilePath,
    path.split('/').filter(Boolean).at(-1) + '.md'
  );
  if (existsSync(filePath)) throw new URIError(Err_SameNameFile);

  const { document } = await loadPage(path);
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
    setOutput('markdown_file_path', filePath);
    await outputFile(filePath, articleText);

  const { repo, ref } = context;
  const successMessage = `
- Original URL: [${meta.title}](${path})
- Original author: [${meta.author || 'anonymous'}](${meta.authorURL})
- Markdown file: [click to edit](https://github.com/${repo.owner}/${
    repo.repo
  }/edit/${join(ref.replace(/^refs\/heads\//, ''), filePath)})`;

  await addComment(successMessage.trim());

  // return  filePath
  setOutput('markdown_file_path', filePath);
})().catch(async (error) => {
  console.log('ERR:', error);
  await addComment(error + '');
  process.exit(1);
});
