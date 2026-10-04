import user from './ask/user'
import userApi from './ask/userApi'
import toolApi from './ask/toolApi'
import shop from './ask/shop'
import kami from './ask/kami'

export default {
    ...user,
    ...userApi,
    ...toolApi,
    ...shop,
    ...kami
}