function currentYear() {
  return (new Date()).getFullYear()
}

export default {
  name: '@okmanideep',
  description: "Android · Web · Design",
  logo: 'logo-black-on-white-square.jpg',
  logo_light: 'logo-white.png',
  cover: 'cover-default-compressed.png',

  //Author's info
  author: 'Manideep Polireddi',
  //edit 'categories' in the front matter of every post to match this username
  username: 'okmanideep',
  location: 'Mumbai, India',
  baseurl: '/',
  url: 'https://okmanideep.me',
  image: 'okmanideep.jpg',
  twitter: 'okmanideep',

  short_url: 'okmanideep.me/',
  google_analytics: "UA-57441445-3",
  current_year: currentYear()
}
