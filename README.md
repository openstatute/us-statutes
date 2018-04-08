# Law of the United States

This repository is part of [OpenStatute](https://openstatute.org), an independent initiative  which aims to make the law accessible to every citizen. It's built on top of the idea of [GitHub for Law](https://blog.abevoelker.com/gitlaw-github-for-laws-and-legal-documents-a-tourniquet-for-american-liberty) that by applying Git and other technologies, methodologies in software development and engineering, legal documents would become freely accessible and trackable by the public.

## How to Use
You can access the available legal documents via GitHub at: https://github.com/openstatute/us-statutes/tree/production or via OpenStatute: https://openstatute.org.

## How It Works
Legal documents and their revisions are kept in `data` folder. Each revision is stored as a markdown file named with its ratified date + included a [front matter](https://jekyllrb.com/docs/frontmatter/) with additonal information regarding the change. [Example](https://github.com/openstatute/us-statutes/blob/master/data/federal/constitution/1791-12-15.md).

Then, [continuous integration (CI) system](https://en.wikipedia.org/wiki/Continuous_integration) will automatically generate a Git tree based on the `data` and publish it to the [production branch](https://github.com/openstatute/us-statutes/tree/production). Git allows users to easily track every change made to these legal documents. [Example](https://github.com/openstatute/us-statutes/commits/production/federal/constitution.md).