function setAccessToken(token){
    localStorage.setItem('ACCESS_TOKEN',token)
}

function setRefreshToken(token){
    localStorage.setItem('REFRESH_TOKEN',token)
}

function getAccessToken(){
    return localStorage.getItem('ACCESS_TOKEN')
}

function getRefreshToken(){
    return localStorage.getItem('REFRESH_TOKEN')
}

export {
    setAccessToken,
    setRefreshToken,
    getAccessToken,
    getRefreshToken
}