const API = `http://localhost:4000`

const fetchData = {
  get: async (path, body) => {
    const convertBody = new URLSearchParams(body).toString();
    const response = await fetch(`${API}${path}?${convertBody}`)
    await (checkFetch(response))

    return response.json()
  },
  post: async (path, body = {}) => {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }

    const response = await fetch(path, options)
    await (checkFetch(response))
  },
  delete: async (path, item) => {
    const options = {
      method: 'DELETE'
    }
    const convertItem = new URLSearchParams(item).toString();
    const response = await fetch(`${API}${path}/${convertItem}`, options)
    await (checkFetch(response))

    return response.json()
  }
}


function checkFetch(response) {
  try {
    if (response.status === 401) {
      location.href = API
    }
    if (response.status < 200 || response.status >= 300) {
      return response.text();
    }
    console.log(response.status)
  } catch (error) {
    if (response) {
      throw new ApiError(`Request failed with status ${response.status}.`, error, response.status);
    } else {
      throw new ApiError(error.toString(), null, 'REQUEST_FAILED');
    }
  }
}

class ApiError {
  constructor(message, data, status) {
    let response = null;
    let isObject = false;
    try {
      response = JSON.parse(data);
      isObject = true;
    }
    catch (e) {
      response = data;
    }
    this.response = response;
    this.message = message;
    this.status = status;
    this.toString = function () {
      return `${this.message}\nResponse:\n${isObject ? JSON.stringify(this.response, null, 2) : this.response}`;
    };
  }
}

let currentUser;

class User {
  constructor(props) {
    this.id = props.id;
    this.email = props.email;
    this.role = props.role;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.image = props.image;
  }


  renderHeder() {
    const userHeaderID = document.getElementById('user-header')
    let userHeaderHTML = userHeaderID.innerHTML
    let userHeader = ''
    userHeader += userHeaderHTML.replace(/<%image%>/g, currentUser.image)
      .replace(/<%fullNameEN%>/g, getFullName.apply(currentUser))
    document.getElementById('header-root').innerHTML = userHeader
    this.canLogOut()
  }

  canLogOut() {
    document.getElementById('log-out').addEventListener('click', logOut)
  }
}


class Admin extends User {
  constructor(props) {
    super(props)
  }

  renderHeder() {
    const adminHeaderID = document.getElementById('admin-header')
    let adminHeaderHTML = adminHeaderID.innerHTML
    let adminHeader = ''
    adminHeader += adminHeaderHTML.replace(/<%image%>/g, currentUser.image)
      .replace(/<%fullNameEN%>/g, getFullName.apply(currentUser)) // add concat Name + Lastname
    document.getElementById('header-root').innerHTML = adminHeader
    document.getElementById('open-admin').addEventListener('click', () => renderAdminPanel(database)) //assign handler to open the admin panel
    document.getElementById('create-account').addEventListener('click', this.createNewAccount)
    this.canLogOut()
  }
}

const createUser = (user) => {
  if (user.role === 'admin') {
    return new Admin(user);
  } else return new User(user);
}

const getFullName = function () {
  return (`${this.firstName} ${this.lastName}`)
}

const autoLogin = (data) => {
  console.log("DATA")
  console.log(data)
  database = data;
  let key = Object.keys(localStorage);
  if (key.length < 1) {
    createLoginForm()
    document.getElementById('login-form').addEventListener('submit', () => {
      authFormHandler(event, data)
    })
  } else {
    database = data;
    const user = checkUser(...key, localStorage.getItem(key), data)
    currentUser = createUser(...user)
    currentUser.renderHeder()
    document.getElementById('content').classList.remove('logged')
  }
}


const createLoginForm = () => {
  let templateAuth = document.getElementById('template-authorization').content
  document.getElementById('root').append(templateAuth)
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const form = document.getElementById('login-form')

  form.addEventListener('click', (event) => {
    event.stopPropagation()
  })

  function addClick() {
    let parent = this.parentNode.parentNode;
    parent.classList.add("focus");
  }

  function removeClick() {
    let parent = this.parentNode.parentNode;
    if (this.value == "") {
      parent.classList.remove("focus");
    }
  }

  email.addEventListener("focus", addClick);
  email.addEventListener("blur", removeClick);
  password.addEventListener("focus", addClick);
  password.addEventListener("blur", removeClick);

}

const logOut = () => {
  localStorage.clear()
  location.href = 'index.html'
}


const checkUser = (targetEmail, targetPassword, database) => {
  console.log(database)
  const findUser = database.filter(el => targetEmail === el.email && targetPassword === el.password)
  return findUser
}

const authFormHandler = (event, data) => {
  event.preventDefault()
  const email = event.target.querySelector('#email').value;
  const password = event.target.querySelector('#password').value;
  console.log(email.length)
  if (email.length < 1 || password.length < 1) {
    console.log('Please enter correct data again')
  } else if (email.length > 1 || password.length > 1) {
    const user = checkUser(email, password, data)
    if (user.length > 0) {
      localStorage.setItem(email, password)
      currentUser = createUser(...user)
      currentUser.renderHeder()
      document.getElementById('login-wrapper').remove()
      document.getElementById('content').classList.remove('logged')
    } else console.log('This account does not exist')

  } else console.log('This account does not exist')

}

const dataFunctionsWrapper = (data) => {
  autoLogin(data.data)
}

fetchData.get(`/users`)
  .then(dataFunctionsWrapper)

const imageUpload = document.getElementById('imageUpload')

Promise.all([
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
]).then(start)

async function start() {
  const container = document.getElementById('upload-image')
  const labeledFaceDescriptors = await loadLabeledImages()
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6)
  let image
  let canvas
  document.body.append('Loaded')
  imageUpload.addEventListener('change', async () => {
    if (image) image.remove()
    if (canvas) canvas.remove()
    image = await faceapi.bufferToImage(imageUpload.files[0])
    container.append(image)
    canvas = faceapi.createCanvasFromMedia(image)
    const displaySize = { width: image.width, height: image.height }
    faceapi.matchDimensions(canvas, displaySize)
    const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))
    results.forEach((result, i) => {
      console.log(result)
      console.log(i)
      const res = document.getElementById('result');
      res.innerText = result.label
    })
  })
}

async function loadLabeledImages() {
  let labels = []

  await fetchData.get('/people')
    .then(response => labels.push(...response.data))

  return Promise.all(
    labels.map(async label => {
      const descriptions = []
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(`/labeled_images/${label.name}/${i}.jpg`)
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
        descriptions.push(detections.descriptor)
      }
      console.log(labels)
      label.name = `First Name: ${label.firstName}\n
                      Last Name: ${label.lastName}\n
                      Gender: ${label.gender}\n
                      Born: ${label.born}\n
                      Home Town: ${label.home}\n
                      Biography: ${label.biography}`
      console.log(descriptions)
      return new faceapi.LabeledFaceDescriptors(label.name, descriptions)
    })
  )
}

document.querySelector("html").classList.add('js');

var fileInput = document.querySelector(".input-file"),
  button = document.querySelector(".input-file-trigger")

button.addEventListener("keydown", function (event) {
  if (event.keyCode == 13 || event.keyCode == 32) {
    fileInput.focus();
  }
});
button.addEventListener("click", function (event) {
  fileInput.focus();
  return false;
});  
