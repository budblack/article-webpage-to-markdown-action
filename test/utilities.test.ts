import { readFile } from 'fs-extra';
import { parseHTML } from 'linkedom';

import { HTMLtoMarkdown, getRouteAddr } from '../src/utilities';

// Reset modules and remove input environment variables before each run
beforeEach(() => {
  jest.resetModules();
  delete process.env.INPUT_NEWSLINK;
  delete process.env.INPUT_markDownFilePath;
});

describe('3. test getRouteAddr(Check the input parameters, and get the routing address of the article.)', () => {
  test('3-1. there is the correct URL in the parameter.', () => {
    expect(
      getRouteAddr(
        '- 原文网址：[Test Example](https://www.freecodecamp.org/news/testexample/)'
      )
    ).toEqual('https://www.freecodecamp.org/news/testexample/');
  });
});

describe('5. test HTMLtoMarkdown().', () => {
  test('Parse Meta, Convert Markdown & Filter Waste', async () => {
    const HTML = await readFile('test/example.html', { encoding: 'utf-8' }),
      Markdown = await readFile('test/example.md', { encoding: 'utf-8' });
    const { document } = parseHTML(HTML);
    const { meta, content } = HTMLtoMarkdown(document);

    expect(meta).toEqual({
      title: 'testexample post-full-title',
      author: 'authorName',
      authorURL: '/news/author/authorURL/'
    });
    expect(content).toBe(Markdown);
  });
});
