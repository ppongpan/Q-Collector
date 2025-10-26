const { sequelize, Form } = require('./models');

async function listForms() {
  try {
    const forms = await Form.findAll({
      attributes: ['id', 'title', 'settings'],
      limit: 10,
      order: [['updatedAt', 'DESC']],
      raw: true
    });

    console.log('Recent Forms:\n');
    forms.forEach((form, i) => {
      console.log(`${i+1}. ID: ${form.id}`);
      console.log(`   Title: ${form.title}`);
      console.log(`   Has publicLink: ${!!form.settings?.publicLink}`);
      if (form.settings?.publicLink) {
        console.log(`   Enabled: ${form.settings.publicLink.enabled}`);
        console.log(`   Slug: ${form.settings.publicLink.slug || 'NOT SET'}`);
        console.log(`   Token: ${form.settings.publicLink.token || 'NOT SET'}`);
      }
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listForms();
